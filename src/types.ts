export enum LinkPrecedence {
  Primary = "primary",
  Secondary = "secondary",
}

export interface Customer {
  id: number;
  phoneNumber: string;
  email: string;
  linkedId: any;
  linkPrecedence: LinkPrecedence;
  createdAt: number;
  updatedAt: any;
  deletedAt: any;
}

export interface Contact {
  primaryContactId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}
