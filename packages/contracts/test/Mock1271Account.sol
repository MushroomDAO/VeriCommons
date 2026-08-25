// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {ERC1271_MAGIC, IERC1271} from "../src/SubjectBinder.sol";

contract Mock1271Account is IERC1271 {
    address public immutable owner;

    constructor(address owner_) {
        owner = owner_;
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly ("memory-safe") {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (ecrecover(hash, v, r, s) == owner) return ERC1271_MAGIC;
        return 0xffffffff;
    }
}
