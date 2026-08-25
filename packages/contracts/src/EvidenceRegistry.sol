// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

/// @notice Optional on-chain anchor of our ticket hash. Not a zkTLS verifier.
contract EvidenceRegistry {
    address public immutable issuer;

    struct Record {
        bytes32 evidenceHash;
        uint64 validUntil;
    }

    mapping(address account => mapping(bytes32 schemaId => Record)) public records;

    error NotIssuer();
    error Expired();

    constructor(address issuer_) {
        issuer = issuer_;
    }

    function anchor(address account, bytes32 schemaId, bytes32 evidenceHash, uint64 validUntil) external {
        if (msg.sender != issuer) revert NotIssuer();
        if (validUntil <= block.timestamp) revert Expired();
        records[account][schemaId] = Record(evidenceHash, validUntil);
    }

    function hasEvidence(address account, bytes32 schemaId) external view returns (bool) {
        Record memory rec = records[account][schemaId];
        return rec.evidenceHash != bytes32(0) && rec.validUntil >= block.timestamp;
    }
}
