// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

/// @dev EIP-1271 magic value.
bytes4 constant ERC1271_MAGIC = 0x1626ba7e;

interface IERC1271 {
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4);
}

/// @notice Bind Web2 ticket.subject to a 4337 account. EOA or ERC-1271.
contract SubjectBinder {
    function isBound(address account, bytes32 challenge, bytes calldata signature) external view returns (bool) {
        if (account.code.length == 0) {
            if (signature.length != 65) return false;
            return _recover(challenge, signature) == account;
        }
        try IERC1271(account).isValidSignature(challenge, signature) returns (bytes4 magic) {
            return magic == ERC1271_MAGIC;
        } catch {
            return false;
        }
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly ("memory-safe") {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        return ecrecover(digest, v, r, s);
    }
}
