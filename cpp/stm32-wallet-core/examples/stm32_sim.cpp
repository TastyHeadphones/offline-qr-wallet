#include <cstdint>
#include <iostream>
#include <string>
#include <unordered_map>

#include "offline_wallet/offline_engine.hpp"

namespace {

class DemoSignatureProvider : public offline_wallet::SignatureProvider {
 public:
  std::string Sign(const std::string& message, const std::string& key_id) override {
    return key_id + ":" + message;
  }

  bool Verify(const std::string& signature,
              const std::string& message,
              const std::string& public_key_or_id) override {
    return signature == (public_key_or_id + ":" + message);
  }
};

class DemoRandomProvider : public offline_wallet::RandomProvider {
 public:
  std::string NextHex(std::size_t /*bytes*/) override {
    ++counter_;
    return "seed" + std::to_string(counter_);
  }

 private:
  std::uint32_t counter_ = 0;
};

class DemoClockProvider : public offline_wallet::ClockProvider {
 public:
  std::uint64_t NowUnixSeconds() const override { return now_; }
  void Advance(std::uint64_t delta_seconds) { now_ += delta_seconds; }

 private:
  std::uint64_t now_ = 1'700'000'000;
};

class InMemoryJournal : public offline_wallet::TransactionJournal {
 public:
  bool Save(const offline_wallet::LocalTransaction& tx) override {
    rows_[tx.tx_id] = tx;
    return true;
  }

  bool Load(const std::string& tx_id, offline_wallet::LocalTransaction* tx_out) const override {
    auto it = rows_.find(tx_id);
    if (it == rows_.end() || tx_out == nullptr) {
      return false;
    }
    *tx_out = it->second;
    return true;
  }

  bool UpdateState(const std::string& tx_id,
                   offline_wallet::TransactionState state,
                   const std::string& reason) override {
    auto it = rows_.find(tx_id);
    if (it == rows_.end()) {
      return false;
    }
    it->second.state = state;
    it->second.failure_reason = reason;
    return true;
  }

 private:
  std::unordered_map<std::string, offline_wallet::LocalTransaction> rows_;
};

}  // namespace

int main() {
  DemoSignatureProvider signature;
  DemoRandomProvider random;
  DemoClockProvider clock;
  InMemoryJournal journal;

  offline_wallet::OfflineEngine engine(offline_wallet::RiskPolicy{}, &signature, &random, &clock, &journal);

  offline_wallet::DeviceContext merchant;
  merchant.account_id = "merchant-account-1";
  merchant.device_id = "merchant-device-1";
  merchant.signing_key_id = "merchant-key";
  merchant.local_counter = 1;

  offline_wallet::DeviceContext payer;
  payer.account_id = "payer-account-1";
  payer.device_id = "payer-device-1";
  payer.signing_key_id = "payer-key";
  payer.local_counter = 7;

  offline_wallet::PaymentIntent intent;
  offline_wallet::LocalTransaction merchant_tx;
  auto intent_result = engine.BuildMerchantIntent(merchant, 560, "CNY", &intent, &merchant_tx);

  if (intent_result.status != offline_wallet::HandshakeStatus::kOk) {
    std::cerr << "intent failed: " << intent_result.message << "\n";
    return 1;
  }

  offline_wallet::PaymentAuthorization authorization;
  offline_wallet::LocalTransaction payer_tx;
  auto auth_result = engine.BuildPayerAuthorization(payer, intent, &authorization, &payer_tx);

  if (auth_result.status != offline_wallet::HandshakeStatus::kOk) {
    std::cerr << "authorization failed: " << auth_result.message << "\n";
    return 1;
  }

  offline_wallet::PaymentReceipt receipt;
  offline_wallet::LocalTransaction accepted_tx;
  auto accept_result = engine.AcceptAuthorization(merchant, authorization, &receipt, &accepted_tx);

  if (accept_result.status != offline_wallet::HandshakeStatus::kOk) {
    std::cerr << "accept failed: " << accept_result.message << "\n";
    return 1;
  }

  std::cout << "offline handshake complete, tx=" << receipt.tx_id
            << " status=pending_sync amount=" << receipt.amount_cents << "\n";
  return 0;
}
