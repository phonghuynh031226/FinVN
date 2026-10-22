export interface BankInfo {
  code: string;
  name: string;
  shortName: string;
  color: string;
  gradient: string;
  textColor: string;
  logoUrl: string;
}

export const VIETNAM_BANKS: BankInfo[] = [
  {
    code: 'VCB',
    name: 'Ngân hàng TMCP Ngoại Thương Việt Nam',
    shortName: 'Vietcombank',
    color: '#005b38',
    gradient: 'linear-gradient(135deg, #0a5c36 0%, #178e58 100%)',
    textColor: '#ffffff',
    logoUrl: 'https://cdn.vietqr.io/img/VCB.png',
  },
  {
    code: 'TCB',
    name: 'Ngân hàng TMCP Kỹ Thương Việt Nam',
    shortName: 'Techcombank',
    color: '#e01a22',
    gradient: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
    textColor: '#ffffff',
    logoUrl: 'https://cdn.vietqr.io/img/TCB.png',
  },
  {
    code: 'MB',
    name: 'Ngân hàng TMCP Quân Đội',
    shortName: 'MBBank',
    color: '#004098',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
    textColor: '#ffffff',
    logoUrl: 'https://cdn.vietqr.io/img/MB.png',
  },
  {
    code: 'ACB',
    name: 'Ngân hàng TMCP Á Châu',
    shortName: 'ACB',
    color: '#0054a6',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    textColor: '#ffffff',
    logoUrl: 'https://cdn.vietqr.io/img/ACB.png',
  },
  {
    code: 'BIDV',
    name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
    shortName: 'BIDV',
    color: '#01579b',
    gradient: 'linear-gradient(135deg, #065f46 0%, #059669 100%)',
    textColor: '#ffffff',
    logoUrl: 'https://cdn.vietqr.io/img/BIDV.png',
  },
  {
    code: 'CTG',
    name: 'Ngân hàng TMCP Công Thương Việt Nam',
    shortName: 'VietinBank',
    color: '#004a99',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    textColor: '#ffffff',
    logoUrl: 'https://cdn.vietqr.io/img/ICB.png',
  },
  {
    code: 'VPB',
    name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng',
    shortName: 'VPBank',
    color: '#009a49',
    gradient: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
    textColor: '#ffffff',
    logoUrl: 'https://cdn.vietqr.io/img/VPB.png',
  },
  {
    code: 'TPB',
    name: 'Ngân hàng TMCP Tiên Phong',
    shortName: 'TPBank',
    color: '#5b2d82',
    gradient: 'linear-gradient(135deg, #6b21a8 0%, #a855f7 100%)',
    textColor: '#ffffff',
    logoUrl: 'https://cdn.vietqr.io/img/TPB.png',
  },
  {
    code: 'STB',
    name: 'Ngân hàng TMCP Sài Gòn Thương Tín',
    shortName: 'Sacombank',
    color: '#004f9f',
    gradient: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
    textColor: '#ffffff',
    logoUrl: 'https://cdn.vietqr.io/img/SACOMBANK.png',
  },
  {
    code: 'MSB',
    name: 'Ngân hàng TMCP Hàng Hải Việt Nam',
    shortName: 'MSB',
    color: '#e31837',
    gradient: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
    textColor: '#ffffff',
    logoUrl: 'https://cdn.vietqr.io/img/MSB.png',
  },
  {
    code: 'OTHER',
    name: 'Ngân hàng / Ví điện tử khác',
    shortName: 'Khác',
    color: '#475569',
    gradient: 'linear-gradient(135deg, #334155 0%, #64748b 100%)',
    textColor: '#ffffff',
    logoUrl: 'https://cdn.vietqr.io/img/VCBNeo.png',
  },
];

export function getBankInfo(bankNameOrCode: string): BankInfo {
  const normalized = bankNameOrCode.toLowerCase().trim();
  const found = VIETNAM_BANKS.find(
    (b) =>
      b.shortName.toLowerCase() === normalized ||
      b.code.toLowerCase() === normalized ||
      b.name.toLowerCase().includes(normalized) ||
      normalized.includes(b.shortName.toLowerCase())
  );
  return found || VIETNAM_BANKS[VIETNAM_BANKS.length - 1];
}
