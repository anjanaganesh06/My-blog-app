# 📝 BlogWithChatbot

A full-stack blogging platform built with **Node.js**, **Express**, **PostgreSQL**, and **EJS**, enhanced with an AI-based content generator powered by OpenRouter's chatbot API.

---

## 🚀 Features

- 🧾 **User Authentication** (Signup, Login, Logout)
- 🔐 **Session Management** with PostgreSQL via `connect-pg-simple`
- 📬 **Create, Read, View Posts** (authenticated users only)
- 🤖 **AI Chat Integration** using OpenRouter API to help generate blog content
- 🧠 **Save AI-generated Posts** to your profile
- 📑 **Post Detail Pages**
- 💾 **Persistent User Sessions**
- 🖼️ **EJS Templating & Static Assets via `public/` folder**

---

## Install Dependencies
npm install

## SET UP POSTGRESQL
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id)
);

-- Required for connect-pg-simple
-- This will be automatically created, or run manually:
-- https://github.com/voxpelli/node-connect-pg-simple#creating-the-session-table

## RUNNING THE APP

node app.js


