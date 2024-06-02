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

// todo: rename CUSTOMER TO CONTACT TABLE
app.post("/api/identify", async (req, res) => {
  const { email, phoneNumber } = req.body;
  // check if email or phoneNumber already exists as primary contact, if yes, then create a new secondary contact
  // do a null chekc ehere...
  try {
    const primaryContact = await itemsPool.query(
      "SELECT * FROM CUSTOMER WHERE  ( email = $1 OR phoneNumber = $2) AND linkprecedence = $3  ",
      [email, phoneNumber, "primary"]
    );
    const secondaryContact = await itemsPool.query(
      "SELECT * FROM CUSTOMER WHERE  ( email = $1 OR phoneNumber = $2) AND linkprecedence = $3  ",
      [email, phoneNumber, "secondary"]
    );

    // check if email or phoneNumber exists
    const existingContact = await itemsPool.query(
      "SELECT * FROM CUSTOMER WHERE email = $1 OR phoneNumber = $2",
      [email, phoneNumber]
    );
    // check if given contact already exists
    const exactContact = await itemsPool.query(
      "SELECT * FROM CUSTOMER WHERE email = $1 AND phoneNumber = $2",
      [email, phoneNumber]
    );
    // to check if email or phoneNumber is null
    const isOneFieldNull = !(!!email && !!phoneNumber);

    // to check if exact contact row exists
    const isExactContact = !!exactContact.rows.length;

    // to check if any primary contact exists
    const isExistingInfo = !!existingContact.rows.length;
    
    console.log("isExactContact", isExactContact);
    console.log("isExistingInfo", isExistingInfo);
    console.log("isOneFieldNull", isOneFieldNull);

    let id = null;
    console.log(email, phoneNumber);
    if (primaryContact.rows.length > 0) {
      id = primaryContact.rows[0].id;
    } else if (secondaryContact.rows.length > 0) {
      id = secondaryContact.rows[0].linkedid;
    }
    console.log("prmary", primaryContact.rows.length);
    console.log("secondry", secondaryContact.rows.length);
    console.log("id >>>", id);

    // creating new primary contact, if email or phoneNumber is new
    if (
      primaryContact.rows.length === 0 &&
      secondaryContact.rows.length === 0
    ) {
      console.log("creating new contact altogether");
      const precedence = "primary";
      const newContact = await itemsPool.query(
        "INSERT INTO CUSTOMER (email, phoneNumber, linkedId, linkPrecedence) VALUES ($1, $2, $3, $4) RETURNING *",
        [email, phoneNumber, id, precedence]
      );
      res.json({
        message: "1st IF Primary contact added!",
        contact: newContact.rows,
      });
    }

    // creating secondary out of primary
    if (primaryContact.rows.length > 1) {
      console.log("converting secondary contact to primary..");
      console.log("primary >", primaryContact.rows);
      const primarySource = primaryContact.rows.filter(
        (contact: any) => contact.email === email
      );
      const secondaryTarget = primaryContact.rows.filter(
        (contact: any) => contact.phonenumber === phoneNumber
      );
      console.log("target contact id >>>", secondaryTarget);
      if (primarySource && secondaryTarget) {
        const targetId = secondaryTarget[0].id;
        const updateContact = await itemsPool.query(
          " UPDATE CUSTOMER SET  linkPrecedence = $1, linkedid=$2, updatedAt=NOW() WHERE id = $3 RETURNING *",
          ["secondary", primarySource[0].id, secondaryTarget[0].id]
        );
        console.log('primary source >>>', primarySource[0])
        const secondaryContacts = await itemsPool.query(
          "SELECT * FROM CUSTOMER WHERE linkedId = $1",
          [primarySource[0].id]
        );
        console.log('secondary contact list >>>', secondaryContacts.rows)
        if (secondaryContacts.rows.length > 0) {
          res.json({
            contact: {
              primaryContactId: primarySource[0].id,
              emails: [
                primarySource[0].email,
                ...secondaryContacts.rows.map((o: any) => o.email),
              ],
              phoneNumbers: [
                primarySource[0].phonenumber,
                ...secondaryContacts.rows.map((o: any) => o.phonenumber),
              ],
              secondaryContactIds: [
                secondaryContacts.rows.map((o: any) => o.id),
              ],
            },
          });
        }
      }

      // if primary exists, then create new secondary contact
      if (primaryContact.rows.length == 1) {
        // && secondaryContact.rows.length === 0) {
        console.log(
          "creating a secondayr contact, if email or number is dff..."
        );
        const precedence = "secondary";
        const newContact = await itemsPool.query(
          "INSERT INTO CUSTOMER (email, phoneNumber, linkedId, linkPrecedence) VALUES ($1, $2, $3, $4) RETURNING *",
          [email, phoneNumber, id, precedence]
        );
        res.json({
          message: "2nd IF Secondary contact added!",
          contact: newContact.rows,
        });
      }

      // nested secondary
      if (
        primaryContact.rows.length == 0 &&
        secondaryContact.rows.length > 0 &&
        !isExactContact
      ) {
        console.log(
          "creating a second secondayr contact, if email or number is dff..."
        );
        const precedence = "secondary";
        const newContact = await itemsPool.query(
          "INSERT INTO CUSTOMER (email, phoneNumber, linkedId, linkPrecedence) VALUES ($1, $2, $3, $4) RETURNING *",
          [email, phoneNumber, id, precedence]
        );
        res.json({
          message: "3rd IF Secondary contact added!",
          contact: newContact.rows,
        });
      }

      // if contact info exists, return Contact Object
      if (
        primaryContact.rows.length == 1 &&
        (isExactContact || (isExistingInfo && isOneFieldNull))
      ) {
        console.log("return contact obj");

        const secondaryContacts = await itemsPool.query(
          "SELECT * FROM CUSTOMER WHERE linkedId = $1",
          [primaryContact.rows[0].id]
        );
        if (secondaryContacts.rows.length > 0) {
          res.json({
            contact: {
              primaryContactId: primaryContact.rows[0].id,
              emails: [
                primaryContact.rows[0].email,
                ...secondaryContacts.rows.map((o: any) => o.email),
              ],
              phoneNumbers: [
                primaryContact.rows[0].phoneNumber,
                ...secondaryContacts.rows.map((o: any) => o.phonenumber),
              ],
              secondaryContactIds: [
                secondaryContacts.rows.map((o: any) => o.id),
              ],
            },
          });
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
