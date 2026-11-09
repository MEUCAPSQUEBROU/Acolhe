import mongoose from "mongoose";
import { normalize } from "../utils/text.js";

// `id` é um slug legível usado pelo frontend; o _id do Mongo fica só no banco.
const animalSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    species: { type: String, required: true, trim: true, maxlength: 40 },
    breed: { type: String, trim: true, maxlength: 80 },
    age: { type: String, trim: true, maxlength: 40 },
    size: { type: String, trim: true, maxlength: 20 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, trim: true, maxlength: 2, default: "SE" },
    gender: { type: String, trim: true, maxlength: 20 },
    vaccinated: Boolean,
    neutered: Boolean,
    urgent: { type: Boolean, default: false },
    organization: { type: String, trim: true, maxlength: 120 },
    contact: { type: String, trim: true, maxlength: 120 },
    whatsapp: { type: String, trim: true, maxlength: 20 },
    sourceType: { type: String, enum: ["external", "acolhe"], required: true },
    externalLink: { type: String, trim: true, maxlength: 500 },
    postedAt: { type: String, required: true },
    traits: { type: [String], default: [] },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    images: { type: [String], default: [] },
    photo: String,
    postedBy: { type: String, select: false },
    searchText: { type: String, select: false },
    cityKey: { type: String, select: false },
}, {
    id: false,
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform: (doc, ret) => {
            delete ret._id;
            delete ret.searchText;
            delete ret.cityKey;
            delete ret.postedBy;
            return ret;
        },
    },
});

animalSchema.pre("validate", function () {
    this.searchText = normalize([this.name, this.breed, this.city, this.organization, this.description].join(" "));
    this.cityKey = normalize(this.city);
});

animalSchema.index({ postedAt: -1, createdAt: -1 });

const Animal = mongoose.models.Animal || mongoose.model("Animal", animalSchema);

export default Animal;
