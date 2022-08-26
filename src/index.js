const express = require("express");
const {v4: uuidv4} = require('uuid');

const app = express();

app.use(express.json());
// app.use(verifyIfAccountCPFExists);

const customers = [];

// Middleware
function verifyIfAccountCPFExists(req, res, next) {
  const { cpf } = req.headers;
  const customer = customers.find(c => c.cpf === cpf);

  if (!customer) {
    return res.status(400).json({ error: "Customer not found" });
  }

  req.customer = customer;

  return next();
}

// Helper functions
function getBalance(statement) {
  return statement.reduce((acc, operation) => {
    return operation.type === 'credit' 
      ? acc + operation.amount 
      : acc - operation.amount
  }, 0);
}

// Routes
app.post('/account', (req, res) => {
  const { cpf, name } = req.body;

  const customerAlreadyExists = customers.some(
    (c) => c.cpf === cpf);

  if (customerAlreadyExists) {
    return res.status(400).json({ error: "Customer already exists" });
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: []
  });

  return res.status(201).send();
});

app.get('/statement/', verifyIfAccountCPFExists, (req, res) => {
  const { customer } = req;
  return res.status(200).json(customer.statement);
});

app.post('/deposit', verifyIfAccountCPFExists, (req, res) => {
  const { description, amount } = req.body;
  const { customer } = req;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit'
  };

  customer.statement.push(statementOperation);

  return res.status(201).send();
});

app.post('/withdraw', verifyIfAccountCPFExists, (req, res) => {
  const { amount } = req.body;
  const { customer } = req;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return res.status(400).json({ error: "Insufficient funds"})
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: 'debit'
  };

  customer.statement.push(statementOperation);

  return res.status(201).send();
});

app.get('/statement/date', verifyIfAccountCPFExists, (req, res) => {
    const { customer } = req;
    const { date } = req.query;

    const dateFormat = new Date(date + " 00:00");
    
    const statement = customer.statement.filter(
        (statement) =>
        statement.created_at.toDateString() ===
        dateFormat.toDateString()
    );

    return res.json(statement);
});

app.put('/account', verifyIfAccountCPFExists, (req, res) => {
  const { name } = req.body;
  const { customer } = req;

  customer.name = name;

  return res.status(201).send();
});

app.get('/account', verifyIfAccountCPFExists, (req, res) => {
  const { customer } = req;
  return res.status(200).json(customer);
});

app.delete('/account', verifyIfAccountCPFExists, (req, res) => {
  const { customer } = req;
  customers.splice(customer, 1);

  return res.status(204).send();
});

app.get('/balance', verifyIfAccountCPFExists, (req, res) => {
  const { customer } = req;

  return res.status(200).json({ balance: getBalance(customer.statement) });
});


// Server listening on port 3333
app.listen(3333);