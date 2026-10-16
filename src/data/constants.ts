export const LEVELS: Record<number, { name: string; desc: string; color: string }> = {
  1: {name:"Grade 9", desc:"Foundational", color:"#3498DB"},
  2: {name:"Grade 10", desc:"Intermediate", color:"#2ECC71"},
  3: {name:"Grade 11", desc:"Advanced", color:"#F39C12"},
  4: {name:"Grade 12", desc:"College Ready", color:"#E74C3C"},
  5: {name:"TOEFL/IELTS", desc:"Academic", color:"#9B59B6"},
  6: {name:"GRE", desc:"Graduate Exam", color:"#16A085"}
};

export const TOTAL_WORDS = 3280;

export const LEVEL_COUNTS: Record<string, number> = {"1": 101, "2": 100, "3": 98, "4": 115, "5": 982, "6": 1884};

export const INTERVALS: Record<number, number> = {10: 1, 20: 10, 30: 1440, 40: 4320, 50: 10080, 60: 43200};

export const GRE_PART_COUNT = 19;

export const GRE_PART_SIZE = 100;
