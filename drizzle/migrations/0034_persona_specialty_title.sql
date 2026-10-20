-- Migration 0034: Adicionar campo specialty_title para personas tituladas
ALTER TABLE `persona` ADD COLUMN `specialty_title` text;
