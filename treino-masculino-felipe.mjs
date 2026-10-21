import { WEEKLY_DRAFTS } from "./treino-semanal.mjs";

// Plano de seis dias reservado para o perfil aprovado de Felipe Gutierres.
// Os vídeos são incorporados a partir de páginas públicas do YouTube.
export const FELIPE_MALE_PLAN_ID = "felipe-male-20261021-videos-v1";

export const FELIPE_MALE_VIDEOS = {
  "Supino reto com halteres": "https://www.youtube.com/watch?v=WRvN4pBQzFs",
  "Supino inclinado": "https://www.youtube.com/watch?v=1Brwk12qqKg",
  "Crucifixo na máquina": "https://www.youtube.com/watch?v=F9MRa661h00",
  "Tríceps na polia": "https://www.youtube.com/watch?v=dTqDKC0D6P4",
  "Tríceps acima da cabeça com corda": "https://www.youtube.com/watch?v=YJ4kGE3eemY",
  "Puxada pela frente": "https://www.youtube.com/watch?v=6YqmVo71MOo",
  "Remada baixa": "https://www.youtube.com/watch?v=HpWWreyaBN0",
  "Remada unilateral": "https://www.youtube.com/watch?v=waqyTVrxFbQ",
  "Rosca direta": "https://www.youtube.com/watch?v=3udY-RlPgEE",
  "Rosca martelo": "https://www.youtube.com/watch?v=pTyVDap5HaI",
  "Agachamento livre ou no Smith": "https://www.youtube.com/watch?v=zgk71dUUt0Y",
  "Leg press": "https://www.youtube.com/watch?v=nY8UsiAqwds",
  "Cadeira extensora": "https://www.youtube.com/watch?v=el3oHblB5DM",
  "Mesa flexora": "https://www.youtube.com/watch?v=2-ULaRrQa7c",
  "Panturrilha em pé": "https://www.youtube.com/watch?v=mx7KyrtL8NI",
  "Abdominal na máquina": "https://www.youtube.com/watch?v=JSBuaT1tHfM",
  "Abdominal supra no chão com anilha": "https://www.youtube.com/watch?v=0CagQ4E97bM",
  "Rotação de tronco na máquina (oblíquos)": "https://www.youtube.com/watch?v=V6K9bt4zbjc",
  "Esteira": "https://www.youtube.com/watch?v=qPoethgMkrc",
  "Stiff com halteres ou barra": "https://www.youtube.com/watch?v=u1E3_u2gJYE",
  "Cadeira flexora": "https://www.youtube.com/watch?v=PK7pTHhy-Fs",
  "Elevação pélvica": "https://www.youtube.com/watch?v=5PW1D19ny7g",
  "Afundo com apoio": "https://www.youtube.com/watch?v=XgWX-G6X5eY",
  "Panturrilha sentada": "https://www.youtube.com/watch?v=a4JAt-XuvlI",
  "Desenvolvimento com halteres": "https://www.youtube.com/watch?v=EuQAfhXBEvs",
  "Elevação lateral": "https://www.youtube.com/watch?v=Tt8m9zlvNx8",
  "Crucifixo inverso": "https://www.youtube.com/watch?v=5HDkxzxe400",
  "Elevação frontal": "https://www.youtube.com/watch?v=Tt8m9zlvNx8",
  "Encolhimento com halteres": "https://www.youtube.com/watch?v=bbSRqGlzdWU"
};

// A quinta-feira do Felipe tem quatro exercícios clássicos; os demais dias
// permanecem iguais ao treino masculino original e o plano da Vitória não muda.
const FELIPE_THURSDAY = {
  day: "quinta",
  name: "Quinta — Abdômen e cardio",
  description: "Abdominais clássicos na máquina, no solo com anilha e oblíquos; finalize com esteira. Priorize a execução controlada e a carga confortável.",
  exercises: [
    {
      name: "Abdominal na máquina",
      sets: 4,
      reps: "12–15 (aquecimento), 12, 10, 8",
      rest: 90,
      notes: "Ajuste o assento e use a contração abdominal para flexionar o tronco, sem puxar com os braços. Aqueça com pouca carga e aumente apenas se manter a boa técnica."
    },
    {
      name: "Abdominal supra no chão com anilha",
      sets: 3,
      reps: "12–15",
      rest: 60,
      notes: "Deite no colchonete, flexione os joelhos e segure uma anilha leve junto ao peito. Eleve as escápulas do solo contraindo o abdômen, sem puxar o pescoço."
    },
    {
      name: "Rotação de tronco na máquina (oblíquos)",
      sets: 3,
      reps: "12 por lado",
      rest: 60,
      notes: "Mantenha quadris estáveis e carga leve. Gire o tronco apenas na amplitude confortável, sem trancos nem forçar a lombar. Faça os dois lados."
    },
    {
      name: "Esteira",
      sets: 1,
      reps: "20–30 minutos",
      rest: 0,
      notes: "Caminhada ou trote conforme condicionamento e orientação do treinador. Comece em velocidade baixa, mantenha postura confortável e reduza gradualmente antes de parar."
    }
  ]
};

export const FELIPE_MALE_PLAN = WEEKLY_DRAFTS.map(workout => {
  const plan = workout.day === "quinta" ? FELIPE_THURSDAY : workout;
  return {
    ...plan,
    exercises: plan.exercises.map(exercise => {
      const video = FELIPE_MALE_VIDEOS[exercise.name];
      if (!video) throw new Error(`Vídeo não configurado para: ${exercise.name}`);
      return { ...exercise, video };
    })
  };
});
