require("dotenv").config();
var { PrismaClient } = require("@prisma/client");
var prisma = new PrismaClient();

async function main() {
  var categories = ["Work", "Personal", "Shopping", "Entertainment"];

  var existing = await prisma.task_categories.findMany({
    select: { name: true },
  });
  var existingNames = existing.map(function (c) { return c.name; });

  var toInsert = categories.filter(function (name) {
    return !existingNames.includes(name);
  });

  if (toInsert.length === 0) {
    console.log("Categories already seeded — nothing to do.");
    return;
  }

  await prisma.task_categories.createMany({
    data: toInsert.map(function (name) { return { name: name }; }),
  });

  console.log("Seeded categories: " + toInsert.join(", "));
}

main()
  .catch(function (e) {
    console.error(e);
    process.exit(1);
  })
  .finally(function () {
    prisma.$disconnect();
  });
