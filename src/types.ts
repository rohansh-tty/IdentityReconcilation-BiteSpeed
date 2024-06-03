export enum LinkPrecedence {
  Primary = "primary",
  Secondary = "secondary",
}

export interface Contact {
  id: number;
  phoneNumber: string;
  email: string;
  linkedId: any;
  linkPrecedence: LinkPrecedence;
  createdAt: number;
  updatedAt: any;
  deletedAt: any;
}

export interface ContactRow{
  id: number;
  phonenumber: string;
  email: string;
  linkedid: any;
  linkPrecedence: LinkPrecedence;
  createdat: number;
  updatedat: any;
  deletedat: any;
}

export interface ContactInfo {
  primaryContactId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}
