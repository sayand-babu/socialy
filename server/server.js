import express from "express";
import "dotenv/config";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { inngest, functions, serve } from "./src/inngest/index.js";

const app = express(); // create the exprress  app

// express .json it will pare the body  if the  content is application json then  store the  json as javascript object in the req.body
// with out this   req.body is undefined
app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

app.get("/", (req, res) => res.send("server is alive"));
app.use("/api/inngest/", serve({ client: inngest, functions }));

// add the prot
const port = process.env.port || 3000;
if (process.env.NODE_ENV === "development") {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
