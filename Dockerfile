FROM node:latest

WORKDIR /usr/src/site

COPY . .

RUN npm install -g typescript
RUN npm install express @types/express

EXPOSE 8000

CMD ["npm", "run", "start"]