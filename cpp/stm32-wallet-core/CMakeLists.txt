cmake_minimum_required(VERSION 3.16)
project(stm32_wallet_core LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(offline_wallet_core STATIC
  src/offline_engine.cpp
)

target_include_directories(offline_wallet_core PUBLIC include)

target_compile_options(offline_wallet_core PRIVATE -Wall -Wextra -Wpedantic)

add_executable(stm32_wallet_example examples/stm32_sim.cpp)
target_link_libraries(stm32_wallet_example PRIVATE offline_wallet_core)

add_executable(offline_wallet_core_test tests/offline_engine_test.cpp)
target_link_libraries(offline_wallet_core_test PRIVATE offline_wallet_core)

enable_testing()
add_test(NAME offline_wallet_core_test COMMAND offline_wallet_core_test)
