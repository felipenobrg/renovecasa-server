import express, { Request, Response } from "express";
import { Pool, QueryResult } from 'pg';
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
});

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors());

const saltRounds: number = 10;

app.post("/register", async (req: Request, res: Response) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const userName = req.body.userName;

    const result: QueryResult = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      await pool.query(
        "INSERT INTO users (userName, email, password) VALUES ($1, $2, $3)",
        [userName, email, hashedPassword]
      );

      res.send({ msg: "Cadastrado com sucesso" });
    } else {
      res.status(400).send({ msg: "Usuário já cadastrado" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro no servidor");
  }
});

app.post("/login", async (req: Request, res: Response) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const result: QueryResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length > 0) {
      const isMatch = await bcrypt.compare(password, result.rows[0].password);

      if (isMatch) {
        res.send({ msg: "Usuário logado com sucesso" });
      } else {
        res.status(400).send({ msg: "Email ou senha incorretos" });
      }
    } else {
      res.status(400).send({ msg: "Email ou senha incorretos" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro no servidor");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Rodando na porta ${PORT}`);
});
