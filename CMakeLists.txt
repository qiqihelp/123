cmake_minimum_required(VERSION 3.16)
project(echofall VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "" FORCE)
endif()

# ---------------------------------------------------------------------------
# Core game library (platform independent).
# ---------------------------------------------------------------------------
add_library(echofall_core STATIC
  src/core/art.cpp
  src/core/battle.cpp
  src/core/canvas.cpp
  src/core/dialogue.cpp
  src/core/game.cpp
  src/core/overworld.cpp
  src/core/sprite.cpp
  src/core/text.cpp
)
target_include_directories(echofall_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/src)
if(MSVC)
  target_compile_options(echofall_core PRIVATE /W4)
else()
  target_compile_options(echofall_core PRIVATE -Wall -Wextra)
endif()

# ---------------------------------------------------------------------------
# Headless test suite - also acts as the native compilation check.
# ---------------------------------------------------------------------------
option(ECHOFALL_BUILD_TESTS "Build the headless test suite" ON)
if(ECHOFALL_BUILD_TESTS)
  enable_testing()
  add_executable(echofall_tests
    tests/test_main.cpp
    src/native/native_platform.cpp
  )
  target_link_libraries(echofall_tests PRIVATE echofall_core)
  target_include_directories(echofall_tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src/core)
  add_test(NAME echofall_tests COMMAND echofall_tests)

  # Renders game states to PPM files - handy for eyeballing the pixel art.
  add_executable(echofall_snapshot
    tools/snapshot.cpp
    src/native/native_platform.cpp
  )
  target_link_libraries(echofall_snapshot PRIVATE echofall_core)
  target_include_directories(echofall_snapshot PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src/core)
endif()

# ---------------------------------------------------------------------------
# WebAssembly front end (built with emcmake).
#
# The output is named *.html on purpose: emscripten only writes the page
# shell when the output file is an html file. The page then loads the
# matching .js and .wasm files next to it.
# ---------------------------------------------------------------------------
option(ECHOFALL_BUILD_WEB "Build the WebAssembly front end" OFF)
option(ECHOFALL_BUILD_WEB_SINGLE "Build a self contained single file bundle" OFF)

function(echofall_add_web_target target output single_file)
  add_executable(${target}
    src/web/web_main.cpp
    src/web/web_platform.cpp
  )
  target_link_libraries(${target} PRIVATE echofall_core)
  target_include_directories(${target} PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src/core)
  set_target_properties(${target} PROPERTIES
    OUTPUT_NAME "${output}"
    SUFFIX ".html"
  )
  target_link_options(${target} PRIVATE
    -O3
    --shell-file ${CMAKE_CURRENT_SOURCE_DIR}/src/web/shell.html
    -sALLOW_MEMORY_GROWTH=1
    -sINITIAL_MEMORY=33554432
    -sSTACK_SIZE=1048576
    -sEXPORT_ES6=0
    -sMODULARIZE=0
    -sENVIRONMENT=web
  )
  if(single_file)
    # Everything (js + wasm) is embedded into the html file, so the game can
    # be played by opening it straight from the file system.
    target_link_options(${target} PRIVATE -sSINGLE_FILE=1)
  endif()
endfunction()

if(ECHOFALL_BUILD_WEB)
  echofall_add_web_target(echofall_web index OFF)
endif()

if(ECHOFALL_BUILD_WEB_SINGLE)
  echofall_add_web_target(echofall_web_single echofall-single ON)
endif()
