-- CreateEnum
CREATE TYPE "InvestorType" AS ENUM ('family_office', 'venture_capital', 'private_equity', 'strategic_corporate', 'other');

-- CreateEnum
CREATE TYPE "Geography" AS ENUM ('us', 'middle_east', 'apac', 'europe', 'other');

-- CreateEnum
CREATE TYPE "CheckSize" AS ENUM ('small', 'mid', 'large');

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "checkSize" "CheckSize",
ADD COLUMN     "geography" "Geography",
ADD COLUMN     "investorType" "InvestorType";
