import Airtable from "airtable";

let baseInstance: ReturnType<Airtable["base"]> | null = null;

// Lazy initialization of Airtable
const getBase = () => {
  if (!baseInstance) {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      throw new Error("Airtable configuration is missing");
    }
    baseInstance = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    }).base(process.env.AIRTABLE_BASE_ID);
  }
  return baseInstance;
};

export default getBase;
