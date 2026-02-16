# STM32 Wallet Core (C++)

Portable C++ core for MCU-oriented integrations (for example STM32 firmware) that need offline QR payment state handling without iOS runtime dependencies.

## Scope

- Offline merchant intent creation
- Offline payer authorization creation
- Merchant acceptance into pending-sync receipt state
- Local transaction journal interface for durable device persistence
- Policy checks (amount, clock skew, intent expiry)

This module intentionally keeps transport and QR encoding out of scope; embed it behind your MCU camera/decoder transport layer.

## Build

```bash
cd cpp/stm32-wallet-core
cmake -S . -B build
cmake --build build
ctest --test-dir build
```

## Integrating on STM32

- Replace demo `SignatureProvider` with your device crypto implementation.
- Replace `RandomProvider` with hardware RNG.
- Replace `ClockProvider` with RTC/time source.
- Implement `TransactionJournal` on flash/NVS for power-loss safety.
