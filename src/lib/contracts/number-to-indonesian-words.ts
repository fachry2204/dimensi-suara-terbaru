export function numberToIndonesianWords(value: number): string {
  const words = [
    "Nol",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];

  const number = Math.trunc(value);

  if (number < 0 || number > 100 || Number.isNaN(number)) {
    throw new Error("Angka terbilang hanya mendukung 0 sampai 100");
  }

  if (number <= 11) return words[number];
  if (number < 20) return `${words[number - 10]} Belas`;
  if (number < 100) {
    const tens = Math.floor(number / 10);
    const rest = number % 10;
    return rest === 0 ? `${words[tens]} Puluh` : `${words[tens]} Puluh ${words[rest]}`;
  }

  return "Seratus";
}
