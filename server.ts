import express, { Request, Response } from "express";
import { PrismaClient } from '@prisma/client';
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcrypt";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors());

const prisma = new PrismaClient({
  datasources: {
    default: {
      url: process.env.DATABASE_URL,
    },
  },
});

const saltRounds: number = 10;

app.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, userName } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).send({ msg: "Usuário já cadastrado" });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const user = await prisma.user.create({
      data: {
        userName,
        email,
        password: hashedPassword,
      },
    });

    res.send({ msg: "Cadastrado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro no servidor");
  }
});


app.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).send({ msg: "Email ou senha incorretos" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      res.send({ msg: "Usuário logado com sucesso" });
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
