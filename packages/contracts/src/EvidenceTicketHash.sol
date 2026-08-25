// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

/// @dev EIP-712 ticket fields only. No zkTLS blob.
struct EvidenceTicketView {
    string version;
    string subject;
    string schema;
    bytes32 claimHash;
    uint256 issuedAt;
    uint256 validUntil;
    bytes32 nonce;
    string backend;
    string verifierSet;
    string trustAssumption;
}

library EvidenceTicketHash {
    bytes32 internal constant TICKET_TYPEHASH = keccak256(
        "EvidenceTicket(string version,string subject,string schema,bytes32 claimHash,uint256 issuedAt,uint256 validUntil,bytes32 nonce,string backend,string verifierSet,string trustAssumption)"
    );

    bytes32 internal constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 internal constant NAME_HASH = keccak256("VeriCommons");
    bytes32 internal constant VERSION_HASH = keccak256("0.1");

    function domainSeparator(uint256 chainId, address verifyingContract) internal pure returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, chainId, verifyingContract));
    }

    function structHash(EvidenceTicketView memory t) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                TICKET_TYPEHASH,
                keccak256(bytes(t.version)),
                keccak256(bytes(t.subject)),
                keccak256(bytes(t.schema)),
                t.claimHash,
                t.issuedAt,
                t.validUntil,
                t.nonce,
                keccak256(bytes(t.backend)),
                keccak256(bytes(t.verifierSet)),
                keccak256(bytes(t.trustAssumption))
            )
        );
    }

    function typedDataHash(EvidenceTicketView memory t, uint256 chainId, address verifyingContract)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(chainId, verifyingContract), structHash(t)));
    }
}
