// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {EvidenceRegistry} from "../src/EvidenceRegistry.sol";
import {EvidenceTicketValidator} from "../src/EvidenceTicketValidator.sol";
import {EvidenceTicketView} from "../src/EvidenceTicketHash.sol";
import {Mock1271Account} from "./Mock1271Account.sol";
import {SubjectBinder} from "../src/SubjectBinder.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function warp(uint256) external;
    function prank(address) external;
}

contract EvidenceTicketValidatorTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 internal constant ISSUER_PK = 1;
    uint256 internal constant OWNER_PK = 2;

    function test_userOpAllowed_iffTicketValid() public {
        address issuer = vm.addr(ISSUER_PK);
        address sender = vm.addr(OWNER_PK);
        EvidenceRegistry registry = new EvidenceRegistry(issuer);
        EvidenceTicketValidator validator =
            new EvidenceTicketValidator(issuer, block.chainid, address(0), registry);

        EvidenceTicketView memory ticket = _ticket(sender, block.timestamp + 1 days);
        bytes memory sig = _sign(ISSUER_PK, validator, ticket);
        require(validator.isUserOpAllowed(sender, ticket, sig), "valid ticket must allow");
        require(!validator.isUserOpAllowed(sender, ticket, hex"aaaa"), "short sig must fail");

        address other = vm.addr(3);
        require(!validator.isUserOpAllowed(other, ticket, sig), "wrong sender must fail");

        ticket.trustAssumption = "";
        sig = _sign(ISSUER_PK, validator, ticket);
        require(!validator.isUserOpAllowed(sender, ticket, sig), "empty trust must fail");
    }

    function test_userOpAllowed_rejectsExpired() public {
        address issuer = vm.addr(ISSUER_PK);
        address sender = vm.addr(OWNER_PK);
        EvidenceTicketValidator validator =
            new EvidenceTicketValidator(issuer, block.chainid, address(0), EvidenceRegistry(address(0)));
        EvidenceTicketView memory ticket = _ticket(sender, block.timestamp + 10);
        bytes memory sig = _sign(ISSUER_PK, validator, ticket);
        require(validator.isUserOpAllowed(sender, ticket, sig), "fresh");
        vm.warp(block.timestamp + 11);
        require(!validator.isUserOpAllowed(sender, ticket, sig), "expired");
    }

    function test_anchoredPath_hasEvidence() public {
        address issuer = vm.addr(ISSUER_PK);
        address sender = vm.addr(OWNER_PK);
        EvidenceRegistry registry = new EvidenceRegistry(issuer);
        EvidenceTicketValidator validator =
            new EvidenceTicketValidator(issuer, block.chainid, address(0), registry);
        bytes32 schemaId = keccak256("onchain.nft.held.v1");
        require(!validator.isUserOpAllowedAnchored(sender, schemaId), "empty");
        vm.prank(issuer);
        registry.anchor(sender, schemaId, bytes32(uint256(1)), uint64(block.timestamp + 1 days));
        require(validator.isUserOpAllowedAnchored(sender, schemaId), "anchored");
    }

    function test_eip1271_bindsAccount() public {
        address owner = vm.addr(OWNER_PK);
        Mock1271Account account = new Mock1271Account(owner);
        SubjectBinder binder = new SubjectBinder();
        bytes32 challenge = keccak256("vericommons-bind");
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(OWNER_PK, challenge);
        bytes memory sig = abi.encodePacked(r, s, v);
        require(binder.isBound(address(account), challenge, sig), "1271 account");
        require(binder.isBound(owner, challenge, sig), "EOA");
        require(!binder.isBound(vm.addr(3), challenge, sig), "wrong account");
    }

    function _ticket(address sender, uint256 validUntil) internal view returns (EvidenceTicketView memory t) {
        t.version = "0.1";
        t.subject = _hex(sender);
        t.schema = "github.repo.star.v1";
        t.claimHash = keccak256("claim");
        t.issuedAt = block.timestamp;
        t.validUntil = validUntil;
        t.nonce = keccak256("nonce");
        t.backend = "github-api";
        t.verifierSet = "vericommons-kernel";
        t.trustAssumption = "SELF";
    }

    function _sign(uint256 pk, EvidenceTicketValidator validator, EvidenceTicketView memory ticket)
        internal
        returns (bytes memory)
    {
        bytes32 digest = validatorHash(validator, ticket);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function validatorHash(EvidenceTicketValidator validator, EvidenceTicketView memory ticket)
        internal
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                keccak256(
                    abi.encode(
                        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                        keccak256("VeriCommons"),
                        keccak256("0.1"),
                        validator.chainId(),
                        validator.verifyingContract()
                    )
                ),
                keccak256(
                    abi.encode(
                        keccak256(
                            "EvidenceTicket(string version,string subject,string schema,bytes32 claimHash,uint256 issuedAt,uint256 validUntil,bytes32 nonce,string backend,string verifierSet,string trustAssumption)"
                        ),
                        keccak256(bytes(ticket.version)),
                        keccak256(bytes(ticket.subject)),
                        keccak256(bytes(ticket.schema)),
                        ticket.claimHash,
                        ticket.issuedAt,
                        ticket.validUntil,
                        ticket.nonce,
                        keccak256(bytes(ticket.backend)),
                        keccak256(bytes(ticket.verifierSet)),
                        keccak256(bytes(ticket.trustAssumption))
                    )
                )
            )
        );
    }

    function _hex(address a) internal pure returns (string memory) {
        bytes16 hexSymbols = "0123456789abcdef";
        bytes memory out = new bytes(42);
        out[0] = "0";
        out[1] = "x";
        uint160 n = uint160(a);
        for (uint256 i = 0; i < 20; i++) {
            uint8 b = uint8(n >> (8 * (19 - i)));
            out[2 + i * 2] = hexSymbols[b >> 4];
            out[3 + i * 2] = hexSymbols[b & 0x0f];
        }
        return string(out);
    }
}
