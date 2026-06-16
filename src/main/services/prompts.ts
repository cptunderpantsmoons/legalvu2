export interface ContractPromptInput {
  contractType: string;
  counterparty: string;
  jurisdiction: string;
  keyTerms: string[];
  indemnity: boolean;
  confidentiality: boolean;
  governingLaw: string;
}

export function buildContractPrompt(input: ContractPromptInput): string {
  return `Draft a ${input.contractType} for counterparty ${input.counterparty} under law of ${input.governingLaw}.
Key terms:
${input.keyTerms.map((t) => "- " + t).join("\n")}
Include indemnity: ${input.indemnity}. Include confidentiality: ${input.confidentiality}.
Generate the full contract text in markdown. Only return the contract text.`;
}
