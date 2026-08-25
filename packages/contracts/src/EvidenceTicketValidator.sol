// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {EvidenceRegistry} from "./EvidenceRegistry.sol";
import {EvidenceTicketHash, EvidenceTicketView} from "./EvidenceTicketHash.sol";

/// @notice 4337 adapter: allow a UserOp.sender iff our ticket is valid.
/// Call from a validator module or paymaster. Does not verify zkTLS.
contract EvidenceTicketValidator {
    address public immutable issuer;
    uint256 public immutable chainId;
    address public immutable verifyingContract;
    EvidenceRegistry public immutable registry;

    error BadTicket();

    constructor(address issuer_, uint256 chainId_, address verifyingContract_, EvidenceRegistry registry_) {
        issuer = issuer_;
        chainId = chainId_;
        verifyingContract = verifyingContract_;
        registry = registry_;
    }

    /// @dev Signature path: EIP-712 ticket signed by our issuer. No proof bytes.
    function isUserOpAllowed(address sender, EvidenceTicketView calldata ticket, bytes calldata signature)
        external
        view
        returns (bool)
    {
        if (bytes(ticket.trustAssumption).length == 0) return false;
        if (block.timestamp > ticket.validUntil) return false;
        if (_parseAddress(ticket.subject) != sender) return false;
        if (signature.length != 65) return false;
        bytes32 digest = EvidenceTicketHash.typedDataHash(ticket, chainId, verifyingContract);
        if (_recover(digest, signature) != issuer) return false;
        return true;
    }

    /// @dev Anchored path: issuer already wrote the ticket hash to the registry.
    function isUserOpAllowedAnchored(address sender, bytes32 schemaId) external view returns (bool) {
        return address(registry) != address(0) && registry.hasEvidence(sender, schemaId);
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

    function _parseAddress(string calldata subject) private pure returns (address) {
        bytes memory str = bytes(subject);
        if (str.length != 42) revert BadTicket();
        if (str[0] != "0" || (str[1] != "x" && str[1] != "X")) revert BadTicket();
        uint160 n;
        for (uint256 i = 2; i < 42; i++) {
            n *= 16;
            uint8 c = uint8(str[i]);
            if (c >= 48 && c <= 57) n += uint160(c - 48);
            else if (c >= 65 && c <= 70) n += uint160(c - 55);
            else if (c >= 97 && c <= 102) n += uint160(c - 87);
            else revert BadTicket();
        }
        return address(n);
    }
}
