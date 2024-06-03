import express from "express";
import { itemsPool } from "./dbconf.js";
import { config } from "dotenv";
config();
const app = express();
app.use(express.json());
const port = 8000;
const returnContactObject = async (primaryContact) => {
    const { rows: secondaryContacts } = await itemsPool.query("SELECT * FROM CONTACT WHERE linkedId = $1", [primaryContact[0].id]);
    return {
        contact: {
            primaryContactId: primaryContact[0].id,
            emails: secondaryContacts.length
                ? [
                    primaryContact[0].email,
                    ...secondaryContacts.map((o) => o.email),
                ]
                : [primaryContact[0].email],
            phoneNumbers: [
                primaryContact[0].phonenumber,
                ...secondaryContacts.map((o) => o.phonenumber),
            ],
            secondaryContactIds: secondaryContacts.length
                ? [secondaryContacts.map((o) => o.id)]
                : [],
        },
    };
};
app.get("/", (req, res) => {
    res.send("Hello, BiteSpeed!");
});
app.get("/api/contacts", async (req, res) => {
    try {
        const allContacts = await itemsPool.query("SELECT * FROM CONTACT");
        res.json({ result: allContacts.rows });
    }
    catch (error) {
        console.log(error);
        res.status(500).send(error.message);
    }
});
// todo: rename CONTACT TO CONTACT TABLE
app.post("/api/identify", async (req, res) => {
    const { email, phoneNumber } = req.body;
    // basic validation for api requests from Postman or other clients
    if (!email || !phoneNumber) {
        res.json({ message: "Email and Phone Number cannot be null" });
        return;
    }
    if ((email && !email.trim()) || (phoneNumber && !phoneNumber.trim())) {
        res.json({ message: "Email and Phone Number both are invalid" });
        return;
    }
    try {
        const { rows: primaryContact } = await itemsPool.query("SELECT * FROM CONTACT WHERE  ( email = $1 OR phoneNumber = $2) AND linkprecedence = $3  ", [email, phoneNumber, "primary"]);
        const { rows: secondaryContact } = await itemsPool.query("SELECT * FROM CONTACT WHERE  ( email = $1 OR phoneNumber = $2) AND linkprecedence = $3  ", [email, phoneNumber, "secondary"]);
        // check if email or phoneNumber exists
        const existingContact = await itemsPool.query("SELECT * FROM CONTACT WHERE email = $1 OR phoneNumber = $2", [email, phoneNumber]);
        // check if given contact already exists
        const exactContact = await itemsPool.query("SELECT * FROM CONTACT WHERE email = $1 AND phoneNumber = $2", [email, phoneNumber]);
        // to check if email or phoneNumber is null
        const isOneFieldNull = !(!!email && !!phoneNumber);
        // to check if exact contact row exists
        const isExactContact = !!exactContact.rows.length;
        // to check if any primary contact exists
        const isExistingInfo = !!existingContact.rows.length;
        let id = null;
        if (primaryContact.length > 0) {
            id = primaryContact[0].id;
        }
        else if (secondaryContact.length > 0) {
            id = secondaryContact[0].linkedid;
        }
        // creating new primary contact, if email or phoneNumber is new
        if (!isExistingInfo) {
            const precedence = "primary";
            await itemsPool.query("INSERT INTO CONTACT (email, phoneNumber, linkedId, linkPrecedence) VALUES ($1, $2, $3, $4) RETURNING *", [email, phoneNumber, id, precedence]);
            const { rows: primaryContact } = await itemsPool.query("SELECT * FROM CONTACT WHERE  ( email = $1 OR phoneNumber = $2) AND linkprecedence = $3  ", [email, phoneNumber, "primary"]);
            const response = await returnContactObject(primaryContact);
            res.json(response);
        }
        // creating secondary out of primary
        if (primaryContact.length > 1) {
            const primarySource = primaryContact.filter((contact) => contact.email === email);
            const secondaryTarget = primaryContact.filter((contact) => contact.phonenumber === phoneNumber);
            if (primarySource && secondaryTarget) {
                const targetId = secondaryTarget[0].id;
                await itemsPool.query(" UPDATE CONTACT SET  linkPrecedence = $1, linkedid=$2, updatedAt=NOW() WHERE id = $3 RETURNING *", ["secondary", primarySource[0].id, targetId]);
                const response = await returnContactObject(primarySource);
                res.json(response);
            }
        }
        // if primary exists, then create new secondary contact
        if (primaryContact.length == 1 && !isExactContact && !isOneFieldNull) {
            const precedence = "secondary";
            await itemsPool.query("INSERT INTO CONTACT (email, phoneNumber, linkedId, linkPrecedence) VALUES ($1, $2, $3, $4) RETURNING *", [email, phoneNumber, id, precedence]);
            const response = await returnContactObject(primaryContact);
            res.json(response);
        }
        // nested secondary, creating a new contact using secondary email/phone, which has not been used by primary contact linked to this.
        // eg: primary contact email: abc@gmail.com phoneNumber:123
        //     secondry contact email: abc@gmail.com phoneNumber:789
        //     secondry contact email: cde@gmail.com phoneNumber:789 ---> to handle this case
        if (!primaryContact.length && secondaryContact.length && !isExactContact) {
            const precedence = "secondary";
            await itemsPool.query("INSERT INTO CONTACT (email, phoneNumber, linkedId, linkPrecedence) VALUES ($1, $2, $3, $4) RETURNING *", [email, phoneNumber, id, precedence]);
            const response = await returnContactObject(primaryContact);
            res.json(response);
        }
        // if contact info exists, return Contact
        if (isExactContact || (isExistingInfo && isOneFieldNull)) {
            const response = await returnContactObject(primaryContact);
            res.json(response);
        }
    }
    catch (error) {
        res.status(500).send(error.message);
    }
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
