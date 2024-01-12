import { PrismaClient } from "@prisma/client";
import express, { Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcrypt";

const app = express();

app.use(express.json());
app.use(cors());

const prisma = new PrismaClient({
  datasources: {
    db: {
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
        cart: {
          create: {
            cartItems: {
              create: [],
            },
          },
        },
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
app.post("/add-to-cart", async (req: Request, res: Response) => {
  const { userId, cartItems } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { cart: { include: { cartItems: true } } },
    });

    if (!user) {
      return res.status(404).send({ msg: "User not found" });
    }

    const cartId = user.cart?.id;

    if (!cartId) {
      return res.status(404).send({ msg: "Cart not found for the user" });
    }

    const cartItemsArray: {
      imgSrc: string;
      title: string;
      price: string;
      productId: string;
      quantity: number;
    }[] = cartItems.map((item: any) => {
      return {
        imgSrc: item.imgSrc,
        title: item.title,
        price: item.price,
        productId: item.productId,
        quantity: item.quantity,
      };
    });

    await prisma.cartItem.createMany({
      data: cartItemsArray.map((item) => ({
        cartId: cartId,
        imgSrc: item.imgSrc,
        title: item.title,
        price: item.price,
        productId: item.productId,
        quantity: item.quantity,
      })),
    });

    res.send({ msg: "Items added to the cart successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Rodando na porta ${PORT}`);
});
