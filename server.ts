import { PrismaClient } from "@prisma/client";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
const jwt = require("jsonwebtoken");
const app = express();
require("dotenv").config();

app.use(express.json());
app.use(cors({
  origin: "https://renovecasajp.com",
  credentials: true,
}));

const prisma = new PrismaClient();

const saltRounds: number = 10;

interface AuthenticatedRequest extends Request {
  user?: { id: number };
}

app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_PASS || "");
      req.user = decoded;
    } catch (error) {
      console.error(error);
      res.status(401).send({ msg: "Unauthorized" });
      return;
    }
  }

  next();
});

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

    const token = jwt.sign({ id: user.id }, process.env.JWT_PASS ?? "", {
      expiresIn: "8h",
    });

    if (isMatch) {
      res.send({
        userName: user.userName,
        userId: user.id,
        token: token,
        msg: "Usuário logado com sucesso",
      });
    } else {
      res.status(400).send({ msg: "Email ou senha incorretos" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro no servidor");
  }
});

app.get("/get-user", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).send({ msg: "User ID not provided" });
    }

    const userIdNumber = parseInt(userId as string, 10);

    if (isNaN(userIdNumber)) {
      return res.status(400).send({ msg: "Invalid User ID" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userIdNumber },
    });

    if (!user) {
      return res.status(404).send({ msg: "User not found" });
    }

    res.send({ cart: user });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/get-cart", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).send({ msg: "User ID not provided" });
    }

    const userIdNumber = parseInt(userId as string, 10);

    if (isNaN(userIdNumber)) {
      return res.status(400).send({ msg: "Invalid User ID" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userIdNumber },
      include: { cart: { include: { cartItems: true } } },
    });

    if (!user) {
      return res.status(404).send({ msg: "User not found" });
    }

    res.send({ cart: user });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/add-to-cart", async (req: AuthenticatedRequest, res: Response) => {
  const { userId, cartItems } = req.body;

  try {
    if (!userId) {
      return res
        .status(400)
        .send({ msg: "UserId está faltando no corpo da requisição" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { cart: { include: { cartItems: true } } },
    });

    if (!user) {
      return res.status(404).send({ msg: "User not found" });
    }

    let cartId: number | undefined;

    if (!user.cart) {
      const createdCart = await prisma.cart.create({
        data: {
          userId: user.id,
        },
      });
      cartId = createdCart.id;
    } else {
      cartId = user.cart.id;
    }

    const cartItemsArray = Array.isArray(cartItems)
      ? cartItems.map((item: any) => ({
          cartId: cartId!,
          imgSrc: item.imgSrc,
          title: item.title,
          price: item.price,
          productId: item.productId,
          quantity: item.quantity,
        }))
      : [];

    await prisma.cartItem.createMany({
      data: cartItemsArray,
    });

    res.send({ msg: "Itens adicionados no carrinho", cartId });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.delete(
  "/remove-from-cart",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.query.userId;

      const userIdNumber = parseInt(userId as string, 10);

      if (isNaN(userIdNumber)) {
        return res.status(400).send({ msg: "Invalid User ID" });
      }

      const productId = req.query.productId;

      const user = await prisma.user.findUnique({
        where: { id: userIdNumber },
        include: { cart: { include: { cartItems: true } } },
      });

      if (!user) {
        return res.status(404).send({ msg: "User not found" });
      }

      if (productId) {
        const cartItem = user.cart!.cartItems.find(
          (item) => item.productId === productId
        );

        if (!cartItem) {
          return res.status(404).send({ msg: "Product not found in the cart" });
        }

        await prisma.cartItem.delete({
          where: {
            id: cartItem.id,
          },
        });

        res.send({ msg: "Item removed from cart", cartId: user.cart!.id });
      } else {
        return res.status(400).send({ msg: "Product ID is required" });
      }
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Rodando na porta ${PORT}`);
});
