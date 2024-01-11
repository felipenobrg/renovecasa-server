import express, { Request, Response } from "express";
import { Pool, RowDataPacket } from "mysql2";
import cors from "cors";
const mysql = require("mysql2");
const helmet = require("helmet");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.use(helmet());

require("dotenv").config();
const db: Pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(express.json());
app.use(cors());

app.post("/register", (req: Request, res: Response) => {
  const email = req.body.email;
  const password = req.body.password;
  const userName = req.body.userName;

  db.query(
    "SELECT * FROM users WHERE email=?",
    [email],
    (err, result: RowDataPacket[]) => {
      if (err) {
        console.error(err);
        res.status(500).send("Erro no servidor");
      } else {
        if (result.length === 0) {
          bcrypt.hash(password, saltRounds, (error: Error, hash: string) => {
            if (error) {
              console.error(error);
              res.status(500).send("Erro no servidor ao criar hash");
            } else {
              db.query(
                "INSERT INTO users (userName, email, password) VALUES (?, ?, ?)",
                [userName, email, hash],
                (insertErr, _result) => {
                  if (insertErr) {
                    console.error(insertErr);
                    res.status(500).send("Erro ao cadastrar usuário");
                  } else {
                    res.send({ msg: "Cadastrado com sucesso" });
                  }
                }
              );
            }
          });
        } else {
          res.status(400).send({ msg: "Usuário já cadastrado" });
        }
      }
    }
  );
});

app.post("/login", (req: Request, res: Response) => {
  const email = req.body.email;
  const password = req.body.password;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (err, result: RowDataPacket[]) => {
      if (err) {
        console.error(err);
        res.status(500).send("Erro no servidor");
      } else {
        if (result.length > 0) {
          bcrypt.compare(
            password,
            result[0].password,
            (compareErr: Error | null, isMatch: boolean) => {
              if (compareErr) {
                console.error(compareErr);
                res.status(500).send("Erro no servidor ao comparar senhas");
              } else {
                if (isMatch) {
                  res.send({ msg: "Usuário logado com sucesso" });
                } else {
                  res.status(400).send({ msg: "Email ou senha incorretos" });
                }
              }
            }
          );
        } else {
          res.status(400).send({ msg: "Email ou senha incorretos" });
        }
      }
    }
  );
});

app.listen(3001, () => {
  console.log("Rodando na porta 3001");
});
