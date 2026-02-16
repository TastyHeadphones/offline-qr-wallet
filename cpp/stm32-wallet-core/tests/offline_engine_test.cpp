#include <cassert>
#include <cstdint>
#include <string>
#include <unordered_map>

#include "offline_wallet/offline_engine.hpp"

namespace {

class TestSignatureProvider : public offline_wallet::SignatureProvider {
 public:
  std::string Sign(const std::string& message, const std::string& key_id) override {
    return key_id + "|" + message;
  }

  bool Verify(const std::string& signature,
              const std::string& message,
              const std::string& public_key_or_id) override {
    return signature == (public_key_or_id + "|" + message);
  }
};

class TestRandomProvider : public offline_wallet::RandomProvider {
 public:
  std::string NextHex(std::size_t /*bytes*/) override {
    ++counter_;
    return "x" + std::to_string(counter_);
  }

 private:
  std::uint32_t counter_ = 0;
};

class TestClockProvider : public offline_wallet::ClockProvider {
 public:
  std::uint64_t NowUnixSeconds() const override { return now_; }

 private:
  std::uint64_t now_ = 1'700'000'000;
};

class TestJournal : public offline_wallet::TransactionJournal {
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
  TestSignatureProvider signature;
  TestRandomProvider random;
  TestClockProvider clock;
  TestJournal journal;

  offline_wallet::OfflineEngine engine(offline_wallet::RiskPolicy{}, &signature, &random, &clock, &journal);

  offline_wallet::DeviceContext merchant{"merchant-1", "merchant-device-1", "m-key", 2};
  offline_wallet::DeviceContext payer{"payer-1", "payer-device-1", "p-key", 9};

  offline_wallet::PaymentIntent intent;
  offline_wallet::LocalTransaction merchant_tx;
  auto intent_result = engine.BuildMerchantIntent(merchant, 400, "CNY", &intent, &merchant_tx);
  assert(intent_result.status == offline_wallet::HandshakeStatus::kOk);

  offline_wallet::PaymentAuthorization authorization;
  offline_wallet::LocalTransaction payer_tx;
  auto auth_result = engine.BuildPayerAuthorization(payer, intent, &authorization, &payer_tx);
  assert(auth_result.status == offline_wallet::HandshakeStatus::kOk);

  offline_wallet::PaymentReceipt receipt;
  offline_wallet::LocalTransaction accepted;
  auto accept_result = engine.AcceptAuthorization(merchant, authorization, &receipt, &accepted);
  assert(accept_result.status == offline_wallet::HandshakeStatus::kOk);
  assert(accepted.state == offline_wallet::TransactionState::kPendingSync);
  assert(receipt.amount_cents == 400);

  return 0;
}
