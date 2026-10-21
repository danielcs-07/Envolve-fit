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
  "Abdominal na polia": "https://www.youtube.com/watch?v=AV5PmZJIrrw",
  "Elevação de joelhos na cadeira romana": "https://www.youtube.com/watch?v=ghwdoXHeiIk",
  "Prancha lateral": "https://www.youtube.com/watch?v=bi5dvCkPBVA",
  "Esteira ou bicicleta": "https://www.youtube.com/watch?v=jK-rpiXerXY",
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

export const FELIPE_MALE_PLAN = WEEKLY_DRAFTS.map(workout => ({
  ...workout,
  exercises: workout.exercises.map(exercise => {
    const video = FELIPE_MALE_VIDEOS[exercise.name];
    if (!video) throw new Error(`Vídeo não configurado para: ${exercise.name}`);
    return { ...exercise, video };
  })
}));
