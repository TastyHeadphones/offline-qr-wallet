#include "offline_wallet/offline_engine.hpp"

#include <sstream>

namespace offline_wallet {

namespace {

std::string BuildKey(const std::string& prefix, const std::string& random_hex) {
  return prefix + random_hex;
}

}  // namespace

OfflineEngine::OfflineEngine(RiskPolicy policy,
                             SignatureProvider* signature_provider,
                             RandomProvider* random_provider,
                             ClockProvider* clock_provider,
                             TransactionJournal* journal)
    : policy_(policy),
      signature_provider_(signature_provider),
      random_provider_(random_provider),
      clock_provider_(clock_provider),
      journal_(journal) {}

HandshakeResult OfflineEngine::BuildMerchantIntent(const DeviceContext& merchant,
                                                   std::int32_t amount_cents,
                                                   const std::string& currency,
                                                   PaymentIntent* intent_out,
                                                   LocalTransaction* tx_out) {
  if (!intent_out || !tx_out) {
    return {HandshakeStatus::kInvalidInput, "output pointer is null"};
  }

  if (amount_cents <= 0 || amount_cents > policy_.max_per_transaction_cents) {
    return {HandshakeStatus::kPolicyDenied, "amount violates policy"};
  }

  const auto now = clock_provider_->NowUnixSeconds();
  PaymentIntent intent{};
  intent.tx_id = BuildKey("tx-", random_provider_->NextHex(8));
  intent.merchant_intent_id = BuildKey("mi-", random_provider_->NextHex(8));
  intent.merchant_account_id = merchant.account_id;
  intent.merchant_device_id = merchant.device_id;
  intent.amount_cents = amount_cents;
  intent.currency = currency;
  intent.merchant_nonce = random_provider_->NextHex(8);
  intent.merchant_counter = merchant.local_counter;
  intent.issued_at_epoch_seconds = now;
  intent.expires_at_epoch_seconds = now + policy_.intent_ttl_seconds;
  intent.merchant_signature =
      signature_provider_->Sign(BuildIntentSignatureMessage(intent), merchant.signing_key_id);

  LocalTransaction tx{};
  tx.tx_id = intent.tx_id;
  tx.merchant_account_id = merchant.account_id;
  tx.merchant_device_id = merchant.device_id;
  tx.amount_cents = amount_cents;
  tx.currency = currency;
  tx.merchant_intent_id = intent.merchant_intent_id;
  tx.merchant_nonce = intent.merchant_nonce;
  tx.merchant_counter = intent.merchant_counter;
  tx.state = TransactionState::kInitiated;
  tx.created_at_epoch_seconds = now;
  tx.updated_at_epoch_seconds = now;
  tx.idempotency_key = BuildKey("merchant:", intent.tx_id);

  if (!journal_->Save(tx)) {
    return {HandshakeStatus::kJournalFailure, "failed to persist local transaction"};
  }

  *intent_out = intent;
  *tx_out = tx;
  return {HandshakeStatus::kOk, "ok"};
}

HandshakeResult OfflineEngine::BuildPayerAuthorization(const DeviceContext& payer,
                                                       const PaymentIntent& intent,
                                                       PaymentAuthorization* authorization_out,
                                                       LocalTransaction* tx_out) {
  if (!authorization_out || !tx_out) {
    return {HandshakeStatus::kInvalidInput, "output pointer is null"};
  }

  const auto now = clock_provider_->NowUnixSeconds();
  if (intent.expires_at_epoch_seconds < now) {
    return {HandshakeStatus::kExpired, "intent expired"};
  }

  if (intent.amount_cents <= 0 || intent.amount_cents > policy_.max_per_transaction_cents) {
    return {HandshakeStatus::kPolicyDenied, "amount violates policy"};
  }

  const std::uint64_t skew = now > intent.issued_at_epoch_seconds
                                 ? now - intent.issued_at_epoch_seconds
                                 : intent.issued_at_epoch_seconds - now;
  if (skew > policy_.max_clock_skew_seconds) {
    return {HandshakeStatus::kPolicyDenied, "clock skew exceeded"};
  }

  PaymentAuthorization authorization{};
  authorization.tx_id = intent.tx_id;
  authorization.merchant_intent_id = intent.merchant_intent_id;
  authorization.payer_authorization_id = BuildKey("pa-", random_provider_->NextHex(8));
  authorization.payer_account_id = payer.account_id;
  authorization.payer_device_id = payer.device_id;
  authorization.amount_cents = intent.amount_cents;
  authorization.currency = intent.currency;
  authorization.payer_nonce = random_provider_->NextHex(8);
  authorization.payer_counter = payer.local_counter;
  authorization.authorized_at_epoch_seconds = now;
  authorization.payer_signature =
      signature_provider_->Sign(BuildAuthorizationSignatureMessage(authorization), payer.signing_key_id);

  LocalTransaction tx{};
  tx.tx_id = authorization.tx_id;
  tx.merchant_account_id = intent.merchant_account_id;
  tx.payer_account_id = payer.account_id;
  tx.merchant_device_id = intent.merchant_device_id;
  tx.payer_device_id = payer.device_id;
  tx.amount_cents = intent.amount_cents;
  tx.currency = intent.currency;
  tx.merchant_intent_id = intent.merchant_intent_id;
  tx.payer_authorization_id = authorization.payer_authorization_id;
  tx.merchant_nonce = intent.merchant_nonce;
  tx.payer_nonce = authorization.payer_nonce;
  tx.merchant_counter = intent.merchant_counter;
  tx.payer_counter = authorization.payer_counter;
  tx.state = TransactionState::kAuthorized;
  tx.created_at_epoch_seconds = now;
  tx.updated_at_epoch_seconds = now;
  tx.idempotency_key = BuildKey("payer:", tx.tx_id + ":" + tx.payer_authorization_id);

  if (!journal_->Save(tx)) {
    return {HandshakeStatus::kJournalFailure, "failed to persist payer transaction"};
  }

  *authorization_out = authorization;
  *tx_out = tx;
  return {HandshakeStatus::kOk, "ok"};
}

HandshakeResult OfflineEngine::AcceptAuthorization(const DeviceContext& merchant,
                                                   const PaymentAuthorization& authorization,
                                                   PaymentReceipt* receipt_out,
                                                   LocalTransaction* tx_out) {
  if (!receipt_out || !tx_out) {
    return {HandshakeStatus::kInvalidInput, "output pointer is null"};
  }

  LocalTransaction tx{};
  if (!journal_->Load(authorization.tx_id, &tx)) {
    return {HandshakeStatus::kUnknownTransaction, "merchant transaction not found"};
  }

  if (tx.merchant_intent_id != authorization.merchant_intent_id ||
      tx.amount_cents != authorization.amount_cents || tx.currency != authorization.currency) {
    return {HandshakeStatus::kMismatch, "authorization does not match intent"};
  }

  tx.payer_account_id = authorization.payer_account_id;
  tx.payer_device_id = authorization.payer_device_id;
  tx.payer_authorization_id = authorization.payer_authorization_id;
  tx.payer_nonce = authorization.payer_nonce;
  tx.payer_counter = authorization.payer_counter;
  tx.state = TransactionState::kPendingSync;
  tx.updated_at_epoch_seconds = clock_provider_->NowUnixSeconds();

  if (!journal_->Save(tx)) {
    return {HandshakeStatus::kJournalFailure, "failed to persist merchant acceptance"};
  }

  PaymentReceipt receipt{};
  receipt.tx_id = authorization.tx_id;
  receipt.receipt_id = BuildKey("r-", random_provider_->NextHex(8));
  receipt.merchant_account_id = merchant.account_id;
  receipt.payer_account_id = authorization.payer_account_id;
  receipt.amount_cents = authorization.amount_cents;
  receipt.currency = authorization.currency;
  receipt.status = TransactionState::kPendingSync;
  receipt.created_at_epoch_seconds = clock_provider_->NowUnixSeconds();

  std::ostringstream message;
  message << receipt.tx_id << "|" << authorization.payer_authorization_id << "|pending_sync";
  receipt.merchant_signature = signature_provider_->Sign(message.str(), merchant.signing_key_id);

  *receipt_out = receipt;
  *tx_out = tx;
  return {HandshakeStatus::kOk, "ok"};
}

std::string OfflineEngine::BuildIntentSignatureMessage(const PaymentIntent& intent) const {
  std::ostringstream stream;
  stream << intent.tx_id << "|" << intent.merchant_intent_id << "|" << intent.amount_cents << "|"
         << intent.currency << "|" << intent.merchant_nonce << "|" << intent.merchant_counter << "|"
         << intent.expires_at_epoch_seconds;
  return stream.str();
}

std::string OfflineEngine::BuildAuthorizationSignatureMessage(
    const PaymentAuthorization& authorization) const {
  std::ostringstream stream;
  stream << authorization.tx_id << "|" << authorization.merchant_intent_id << "|"
         << authorization.amount_cents << "|" << authorization.currency << "|" << authorization.payer_nonce
         << "|" << authorization.payer_counter << "|" << authorization.authorized_at_epoch_seconds;
  return stream.str();
}

}  // namespace offline_wallet
