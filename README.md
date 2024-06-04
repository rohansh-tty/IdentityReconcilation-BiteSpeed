# IdentityReconcilation-BiteSpeed

Running here [live on render](https://identityreconcilation-bitespeed.onrender.com) 🌟

### Tech Stack used
- **Database**: PostgreSQL
- **Backend Framework**: NodeJS with Typescript

I had absolute fun solving this problem statement. Found couple of edge cases, have added conditions for them too. There's a basic input validation at start to check if both email and phonenumber is not null. And then a function to validate both email and phonenumber.


### File Structure

```
── dist
│   ├── dbconf.js
│   ├── index.js
│   └── types.js
├── eslint.config.js
├── package.json
├── package-lock.json
├── README.md
├── src
│   ├── dbconf.ts
│   ├── index.ts
│   └── types.ts
└── tsconfig.json
```

### Endpoints Exposed

- [/api/contacts](https://identityreconcilation-bitespeed.onrender.com/api/contacts) - to return all contacts from FluxKart DB
- [/api/identify](https://identityreconcilation-bitespeed.onrender.com/api/identify) - for identity reconcilation of FluxKart Customers

### Edge Case I found 

#### Handling Nested Secondary Contacts

When creating a new contact using a secondary email or phone number, ensure that these details have not been used by the primary contact linked to this record. 

##### Example:
- **Primary Contact**
  - Email: `abc@gmail.com`
  - Phone Number: `123`

- **Secondary Contacts**
  - Email: `abc@gmail.com`, Phone Number: `789`
  - Email: `cde@gmail.com`, Phone Number: `789`

The goal is to manage cases where the secondary contact’s email or phone number overlaps with other contacts.