import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Pastikan ada 1 baris pengaturan default
  await prisma.electionSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, resultVisible: false, votingOpen: true },
  });

  // Contoh 3 paslon dummy - ganti / hapus lewat dashboard admin
  const existingCandidates = await prisma.candidate.count();
  if (existingCandidates === 0) {
    await prisma.candidate.createMany({
      data: [
        {
          number: 1,
          chairName: "Nama Calon Ketua 1",
          viceName: "Nama Calon Wakil 1",
          vision: "Visi paslon 1 (isi lewat dashboard admin)",
          mission: "Misi paslon 1 (isi lewat dashboard admin)",
        },
        {
          number: 2,
          chairName: "Nama Calon Ketua 2",
          viceName: "Nama Calon Wakil 2",
          vision: "Visi paslon 2 (isi lewat dashboard admin)",
          mission: "Misi paslon 2 (isi lewat dashboard admin)",
        },
        {
          number: 3,
          chairName: "Nama Calon Ketua 3",
          viceName: "Nama Calon Wakil 3",
          vision: "Visi paslon 3 (isi lewat dashboard admin)",
          mission: "Misi paslon 3 (isi lewat dashboard admin)",
        },
      ],
    });
  }

  // Contoh 3 pemilih dummy - untuk testing alur voting pakai NISN (10 digit, leading zero aman)
  const existingVoters = await prisma.voter.count();
  if (existingVoters === 0) {
    await prisma.voter.createMany({
      data: [
        { nisn: "0103150447", name: "Contoh Siswa 1" },
        { nisn: "0103150448", name: "Contoh Siswa 2" },
        { nisn: "0103150449", name: "Contoh Siswa 3" },
      ],
    });
  }

  const voters = await prisma.voter.findMany({ select: { nisn: true, name: true } });
  console.log("Seed selesai. NISN contoh untuk testing:");
  console.table(voters);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
