#pragma once

#include <cstddef>
#include <string>

#include "offline_wallet/models.hpp"

namespace offline_wallet {

class SignatureProvider {
 public:
  virtual ~SignatureProvider() = default;
  virtual std::string Sign(const std::string& message, const std::string& key_id) = 0;
  virtual bool Verify(const std::string& signature,
                      const std::string& message,
                      const std::string& public_key_or_id) = 0;
};

class RandomProvider {
 public:
  virtual ~RandomProvider() = default;
  virtual std::string NextHex(std::size_t bytes) = 0;
};

class ClockProvider {
 public:
  virtual ~ClockProvider() = default;
  virtual std::uint64_t NowUnixSeconds() const = 0;
};

class TransactionJournal {
 public:
  virtual ~TransactionJournal() = default;
  virtual bool Save(const LocalTransaction& tx) = 0;
  virtual bool Load(const std::string& tx_id, LocalTransaction* tx_out) const = 0;
  virtual bool UpdateState(const std::string& tx_id,
                           TransactionState state,
                           const std::string& reason) = 0;
};

}  // namespace offline_wallet
