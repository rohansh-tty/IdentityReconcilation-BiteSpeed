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
      "SELECT * FROM CUSTOMER WHERE email = $1 OR phoneNumber = $2", [email, phoneNumber]
    )
    const exactContact = await itemsPool.query(
      "SELECT * FROM CUSTOMER WHERE email = $1 AND phoneNumber = $2", [email, phoneNumber]
    )
    const isExactContact = !!exactContact.rows.length
    const isExistingInfo = !!existingContact.rows.length
    console.log('isExactContact', isExactContact)
    console.log('isExistingInfo', isExistingInfo)


    let id = null;
    console.log(email, phoneNumber);
    if (primaryContact.rows.length > 0) {
      id = primaryContact.rows[0].id;
    } else if (secondaryContact.rows.length > 0) {
      id = secondaryContact.rows[0].linkedid;
    }
    console.log("prmary", primaryContact.rows);
    console.log("secondry", secondaryContact.rows);
    console.log("id >>>", id);

    // insert a new row with linkprecedence of primary, if email or phoneNumber doesnt exist in db
    if (
      primaryContact.rows.length === 0 &&
      secondaryContact.rows.length === 0
    ) {
      console.log('creating new contact altogether')
      const precedence = "primary";
      const newContact = await itemsPool.query(
        "INSERT INTO CUSTOMER (email, phoneNumber, linkedId, linkPrecedence) VALUES ($1, $2, $3, $4) RETURNING *",
        [email, phoneNumber, id, precedence]
      );
      res.json({
        message: "1st IF Secondary contact added!",
        contact: newContact.rows,
      });
    }

    // if primary exists, then create a secondary contact(only if there's no secondary contact with exat name and number)
    if (primaryContact.rows.length > 0 && secondaryContact.rows.length === 0) {
      console.log('creating a secondayr contact, if email or number is dff...')
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

    // if primary contact, may or may not exist, but only seocndayr ones, then use linkedId as id
    if (primaryContact.rows.length == 0 && secondaryContact.rows.length > 0 && !isExactContact) {
      console.log('creating a second secondayr contact, if email or number is dff...')
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

    // return Contact Object specifying, secondary contact rows
    if (primaryContact.rows.length > 0 && isExactContact) {
      console.log('return contact obj')

      const secondaryContacts = await itemsPool.query(
        "SELECT * FROM CUSTOMER WHERE linkedId = $1",
        [primaryContact.rows[0].id]
      );
      if (secondaryContacts.rows.length > 0) {
        res.json({
          contact: {
            primaryContactId: primaryContact.rows[0].id,
            emails: [secondaryContacts.rows.map((o: any) => o.email)],
            phoneNumbers: [
              secondaryContacts.rows.map((o: any) => o.phonenumber),
            ],
            secondaryContactIds: [secondaryContacts.rows.map((o: any) => o.id)],
          },
        });
      }
    }

  } catch (error) {
    console.log(error);
  }
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
