import { getAddress, Interface, recoverAddress } from "ethers";

const MAGIC = "0x1626ba7e";
const erc1271 = new Interface([
  "function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)",
]);

export interface BindInput {
  account: string;
  challenge: string;
  signature: string;
  getCode: (address: string) => Promise<string>;
  ethCall?: (to: string, data: string) => Promise<string>;
}

/** Web2 ticket.subject must equal this 4337 account after the challenge succeeds. */
export async function isBound(input: BindInput): Promise<boolean> {
  const account = getAddress(input.account);
  const code = await input.getCode(account);
  if (!code || code === "0x") {
    try {
      return getAddress(recoverAddress(input.challenge, input.signature)) === account;
    } catch {
      return false;
    }
  }
  if (!input.ethCall) return false;
  const data = erc1271.encodeFunctionData("isValidSignature", [input.challenge, input.signature]);
  const raw = await input.ethCall(account, data);
  const [magic] = erc1271.decodeFunctionResult("isValidSignature", raw);
  return String(magic).toLowerCase() === MAGIC;
}

export function subjectMatchesAccount(ticketSubject: string, account: string): boolean {
  try {
    return getAddress(ticketSubject) === getAddress(account);
  } catch {
    return false;
  }
}
