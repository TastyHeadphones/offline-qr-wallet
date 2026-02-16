#pragma once

#include <cstdint>
#include <string>

namespace offline_wallet {

enum class TransactionState {
  kInitiated,
  kAuthorized,
  kPendingSync,
  kSynced,
  kRejected,
  kExpired,
};

struct RiskPolicy {
  std::int32_t max_per_transaction_cents = 10'000;
  std::int32_t max_per_day_per_payer_cents = 50'000;
  std::uint32_t max_clock_skew_seconds = 300;
  std::uint32_t intent_ttl_seconds = 30;
};

struct DeviceContext {
  std::string account_id;
  std::string device_id;
  std::string signing_key_id;
  std::uint32_t local_counter = 0;
};

struct PaymentIntent {
  std::string tx_id;
  std::string merchant_intent_id;
  std::string merchant_account_id;
  std::string merchant_device_id;
  std::int32_t amount_cents = 0;
  std::string currency = "CNY";
  std::string merchant_nonce;
  std::uint32_t merchant_counter = 0;
  std::uint64_t issued_at_epoch_seconds = 0;
  std::uint64_t expires_at_epoch_seconds = 0;
  std::string merchant_signature;
};

struct PaymentAuthorization {
  std::string tx_id;
  std::string merchant_intent_id;
  std::string payer_authorization_id;
  std::string payer_account_id;
  std::string payer_device_id;
  std::int32_t amount_cents = 0;
  std::string currency = "CNY";
  std::string payer_nonce;
  std::uint32_t payer_counter = 0;
  std::uint64_t authorized_at_epoch_seconds = 0;
  std::string payer_signature;
};

struct PaymentReceipt {
  std::string tx_id;
  std::string receipt_id;
  std::string merchant_account_id;
  std::string payer_account_id;
  std::int32_t amount_cents = 0;
  std::string currency = "CNY";
  TransactionState status = TransactionState::kPendingSync;
  std::uint64_t created_at_epoch_seconds = 0;
  std::string merchant_signature;
};

struct LocalTransaction {
  std::string tx_id;
  std::string merchant_account_id;
  std::string payer_account_id;
  std::string merchant_device_id;
  std::string payer_device_id;
  std::int32_t amount_cents = 0;
  std::string currency = "CNY";
  std::string merchant_intent_id;
  std::string payer_authorization_id;
  std::string merchant_nonce;
  std::string payer_nonce;
  std::uint32_t merchant_counter = 0;
  std::uint32_t payer_counter = 0;
  TransactionState state = TransactionState::kInitiated;
  std::string failure_reason;
  std::uint64_t created_at_epoch_seconds = 0;
  std::uint64_t updated_at_epoch_seconds = 0;
  std::string idempotency_key;
};

}  // namespace offline_wallet
