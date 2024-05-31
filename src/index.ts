import express from "express";
const itemsPool = require("./dbconf.ts");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(express.json());
const port = 8000;

app.get("/", (req, res) => {
  res.send("Hello, BiteSpeed!");
});

app.get("/api/customers", async (req, res) => {
  try {
    const allCustomers = await itemsPool.query("SELECT * FROM CUSTOMER");
    res.json({ result: allCustomers.rows });
  } catch (error: any) {
    console.log(error);
    res.status(500).send(error.message);
  }
});

// endpoint to check if contact name or email already exists, if yes, return the contact id, else create new contact and return null
app.post("/api/identify", async (req, res) => {
  const { email, phoneNumber } = req.body;
  try {
    const checkContact = await itemsPool.query(
      "SELECT * FROM CUSTOMER WHERE email = $1 OR phoneNumber = $2",
      [email, phoneNumber]
    );
    let sameContact = null;
    if (email && phoneNumber) {
        console.log("email and phonenumber", email, phoneNumber);
      sameContact = await itemsPool.query(
        "SELECT * FROM CUSTOMER WHERE email = $1 AND phonenumber = $2",
        [email,phoneNumber]
      );
    } else if (email) {
      sameContact = await itemsPool.query(
        "SELECT * FROM CUSTOMER WHERE email = $1 AND linkprecedence = $2",
        [email, "primary"]
      );
    } else if (phoneNumber) {
      sameContact = await itemsPool.query(
        "SELECT * FROM CUSTOMER WHERE phonenumber = $1 AND linkprecedence = $2",
        [phoneNumber, "primary"]
      );
    }

    console.log("checkContact", checkContact.rows);
    console.log("sameContact", sameContact.rows);

    // if contact is secondary, return Contact Object
    if (sameContact.rows.length > 0) {
      const secondaryContacts = await itemsPool.query(
        "SELECT * FROM CUSTOMER WHERE linkedId = $1",
        [sameContact.rows[0].linkedid]
      );
      if (secondaryContacts.rows.length > 0) {
        res.json({
          contact: {
            primaryContactId: sameContact.rows[0].linkedid,
            emails: [secondaryContacts.rows.map((o: any) => o.email)],
            phoneNumbers: [
              secondaryContacts.rows.map((o: any) => o.phonenumber),
            ],
            secondaryContactIds: [secondaryContacts.rows.map((o: any) => o.id)],
          },
        });
      } else {
        res.json({
          message:
            "Input contact is primary contact, no secondary contacts found.",
        });
      }
    }

    if (checkContact.rows.length > 0 && sameContact.rows.length === 0) {
      // create a new contact with linkPrecedence = secondary
      // get primary contact id and link to secondary row's linkedId
      let currentId = null;
      const primaryContact = await itemsPool.query(
        `SELECT * FROM CUSTOMER WHERE linkedId IS NULL AND (email = $1 OR phoneNumber = $2)`,
        [email, phoneNumber]
      );
      // edge case: if primary contact doesnt exist, use secondary contact to get linkedid
      if (primaryContact.rows.length === 0) {
        const secondaryContact = await itemsPool.query(
          `SELECT * FROM CUSTOMER WHERE linkPrecedence = 'secondary' AND (email = $1 OR phoneNumber = $2)`,
          [email, phoneNumber]
        );
        currentId = secondaryContact.rows[0].linkedid;
        const newContact = await itemsPool.query(
          "INSERT INTO CUSTOMER (email, phoneNumber, linkedId, linkPrecedence) VALUES ($1, $2, $3, $4) RETURNING *",
          [email, phoneNumber, currentId, "secondary"]
        );

        res.json({
          message: "New Secondary Contact created!",
          contact: newContact.rows[0],
        });
      } else {
        // for conversion of primary to secondary contacts
        currentId = primaryContact.rows[0].id;
        console.log(
          "secondary contaact not found, primary contact querying...",
          primaryContact.rows[0]
        );
      }
    } else if (
      checkContact.rows.length === 0 &&
      sameContact.rows.length === 0
    ) {
      const linkPrecedence = "primary";
      const newContact = await itemsPool.query(
        "INSERT INTO CUSTOMER (email, phoneNumber, linkPrecedence) VALUES ($1, $2, $3) RETURNING *",
        [email, phoneNumber, linkPrecedence]
      );
      res.json({
        message: "New contact added!",
        contact: newContact.rows,
      });
    }
  } catch (error: any) {
    console.log(error);
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
