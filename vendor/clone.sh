#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/src"
mkdir -p "$SRC"
clone() {
  local url="$1" dir="$2"
  if [[ -d "$SRC/$dir/.git" ]]; then
    echo "skip $dir (already cloned)"
    return
  fi
  echo "clone $dir"
  git clone --depth 1 "$url" "$SRC/$dir"
}
clone https://github.com/reclaimprotocol/zk-fetch.git zk-fetch
clone https://github.com/tlsnotary/tlsn.git tlsn
clone https://github.com/ethereum-attestation-service/eas-contracts.git eas-contracts
clone https://github.com/eth-infinitism/account-abstraction.git account-abstraction
clone https://github.com/zkemail/zk-email-verify.git zk-email-verify
echo "done. sources in $SRC"
