#pragma once

#include <string>

#include "offline_wallet/interfaces.hpp"
#include "offline_wallet/models.hpp"

namespace offline_wallet {

enum class HandshakeStatus {
  kOk,
  kPolicyDenied,
  kExpired,
  kInvalidInput,
  kJournalFailure,
  kUnknownTransaction,
  kMismatch,
};

struct HandshakeResult {
  HandshakeStatus status = HandshakeStatus::kOk;
  std::string message;
};

class OfflineEngine {
 public:
  OfflineEngine(RiskPolicy policy,
                SignatureProvider* signature_provider,
                RandomProvider* random_provider,
                ClockProvider* clock_provider,
                TransactionJournal* journal);

  HandshakeResult BuildMerchantIntent(const DeviceContext& merchant,
                                      std::int32_t amount_cents,
                                      const std::string& currency,
                                      PaymentIntent* intent_out,
                                      LocalTransaction* tx_out);

  HandshakeResult BuildPayerAuthorization(const DeviceContext& payer,
                                          const PaymentIntent& intent,
                                          PaymentAuthorization* authorization_out,
                                          LocalTransaction* tx_out);

  HandshakeResult AcceptAuthorization(const DeviceContext& merchant,
                                      const PaymentAuthorization& authorization,
                                      PaymentReceipt* receipt_out,
                                      LocalTransaction* tx_out);

 private:
  std::string BuildIntentSignatureMessage(const PaymentIntent& intent) const;
  std::string BuildAuthorizationSignatureMessage(const PaymentAuthorization& authorization) const;

  RiskPolicy policy_;
  SignatureProvider* signature_provider_;
  RandomProvider* random_provider_;
  ClockProvider* clock_provider_;
  TransactionJournal* journal_;
};

}  // namespace offline_wallet
