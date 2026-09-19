-- CreateEnum
CREATE TYPE "ElectricityReadingType" AS ENUM ('REAL', 'ESTIMATED');

-- CreateEnum
CREATE TYPE "ElectricityBillStatus" AS ENUM ('NORMAL', 'RECTIFICATIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "Home" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Home_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "address" TEXT,
    "market" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectricitySupplyPoint" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "cups" TEXT NOT NULL,
    "distributor" TEXT,
    "accessContract" TEXT,
    "gridToll" TEXT,
    "addressLine" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "contractedPowerP1" DECIMAL(8,3),
    "contractedPowerP2" DECIMAL(8,3),
    "meters" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectricitySupplyPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectricityCostCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectricityCostCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectricityBill" (
    "id" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "consumptionKwh" DECIMAL(12,3) NOT NULL,
    "readingType" "ElectricityReadingType",
    "status" "ElectricityBillStatus" NOT NULL DEFAULT 'NORMAL',
    "originalBillId" TEXT,
    "pdfUrl" TEXT,
    "homeId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "supplyPointId" TEXT,
    "invoiceNumber" TEXT,
    "referenceNumber" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "periodDays" INTEGER,
    "tariff" TEXT,
    "contractNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectricityBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectricityBillCostLine" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ElectricityBillCostLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRecord" (
    "id" TEXT NOT NULL,
    "sourceTable" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginRateLimit" (
    "keyHash" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginRateLimit_pkey" PRIMARY KEY ("keyHash")
);

-- CreateTable
CREATE TABLE "SessionControl" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "revokedBefore" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionControl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ElectricitySupplyPoint_homeId_idx" ON "ElectricitySupplyPoint"("homeId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectricitySupplyPoint_cups_key" ON "ElectricitySupplyPoint"("cups");

-- CreateIndex
CREATE UNIQUE INDEX "ElectricityCostCategory_name_key" ON "ElectricityCostCategory"("name");

-- CreateIndex
CREATE INDEX "ElectricityBill_homeId_issueDate_idx" ON "ElectricityBill"("homeId", "issueDate");

-- CreateIndex
CREATE INDEX "ElectricityBill_providerId_issueDate_idx" ON "ElectricityBill"("providerId", "issueDate");

-- CreateIndex
CREATE INDEX "ElectricityBill_periodStart_periodEnd_idx" ON "ElectricityBill"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ElectricityBill_originalBillId_idx" ON "ElectricityBill"("originalBillId");

-- CreateIndex
CREATE INDEX "ElectricityBillCostLine_categoryId_idx" ON "ElectricityBillCostLine"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectricityBillCostLine_billId_categoryId_key" ON "ElectricityBillCostLine"("billId", "categoryId");

-- CreateIndex
CREATE INDEX "ImportRecord_sourceTable_targetId_idx" ON "ImportRecord"("sourceTable", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRecord_sourceTable_sourceId_key" ON "ImportRecord"("sourceTable", "sourceId");

-- CreateIndex
CREATE INDEX "LoginRateLimit_blockedUntil_idx" ON "LoginRateLimit"("blockedUntil");

-- AddForeignKey
ALTER TABLE "ElectricitySupplyPoint" ADD CONSTRAINT "ElectricitySupplyPoint_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityBill" ADD CONSTRAINT "ElectricityBill_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityBill" ADD CONSTRAINT "ElectricityBill_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "EnergyProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityBill" ADD CONSTRAINT "ElectricityBill_supplyPointId_fkey" FOREIGN KEY ("supplyPointId") REFERENCES "ElectricitySupplyPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityBill" ADD CONSTRAINT "ElectricityBill_originalBillId_fkey" FOREIGN KEY ("originalBillId") REFERENCES "ElectricityBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityBillCostLine" ADD CONSTRAINT "ElectricityBillCostLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "ElectricityBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityBillCostLine" ADD CONSTRAINT "ElectricityBillCostLine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ElectricityCostCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
