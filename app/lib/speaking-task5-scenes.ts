import type { Task5ScenePair } from "./speaking-image-style";

/**
 * Official-style Task 5: two objective options to compare and choose (place, product, layout).
 * People are optional — focus on the thing being chosen.
 */
export const SPEAKING_TASK5_SCENE_PAIRS: Task5ScenePair[] = [
  {
    theme: "choosing where to live",
    situation:
      "Your friend is deciding between two apartments and wants your opinion on which one to rent.",
    suggestedPerson: "your friend Maya",
    labelA: "modern downtown studio",
    labelB: "suburban two-bedroom",
    promptA:
      "wide view of a compact modern studio apartment: open kitchenette with bar stools, single sofa bed, floor-to-ceiling window showing city towers and traffic, small dining nook, bike leaning by door, tidy minimalist furniture, bright daylight, no people",
    promptB:
      "wide view of a suburban two-bedroom apartment: separate living room with couch and TV, dining table with four chairs, hallway to two bedroom doors, sliding door to small balcony with backyard fence visible, coat rack and shoes by entry, warm afternoon light, no people",
    factsA: ["$1,450 per month", "5-minute walk to subway", "about 450 square feet"],
    factsB: ["$1,650 per month", "20-minute bus to downtown", "about 850 square feet with two bedrooms"],
  },
  {
    theme: "choosing a car",
    situation:
      "Your sibling is buying a car and asked you to help pick between these two models at the dealership.",
    suggestedPerson: "your younger brother Jake",
    labelA: "compact hatchback",
    labelB: "family SUV",
    promptA:
      "showroom floor with a small red compact hatchback on a circular platform: hatch open showing small trunk, fuel-economy sticker shape on window without readable text, polished tile floor, other cars blurred in background, bright dealership lights, no people",
    promptB:
      "showroom floor with a silver family SUV as the only vehicle in frame: larger cargo area visible, roof rack, child-seat anchor icons on rear door shape, polished tile floor, bright dealership lights, price placard stand without readable text, no people",
    factsA: ["about $22,000", "rated 6.2 L per 100 km", "easier to park downtown"],
    factsB: ["about $34,000", "seven seats", "all-wheel drive for winter roads"],
  },
  {
    theme: "choosing a child's bed",
    situation:
      "Your coworker is furnishing a child's room and wants advice on which bed to buy.",
    suggestedPerson: "your coworker Priya",
    labelA: "race-car bed",
    labelB: "classic wooden twin bed",
    promptA:
      "children's bedroom with a red race-car shaped bed as the focal point: striped rug, toy bins, rocket poster on wall without readable text, small desk with lamp, window with curtains, colourful walls, no child visible",
    promptB:
      "same size bedroom with a simple wooden twin bed with white duvet: bookshelf with books, neutral paint, nightstand with alarm clock shape, stuffed bear on bed, closet door ajar, soft daylight, no people",
    factsA: ["$320", "includes built-in toy storage drawers", "fits a standard twin mattress"],
    factsB: ["$180", "solid wood frame", "can add a trundle later for sleepovers"],
  },
  {
    theme: "choosing a vacation stay",
    situation:
      "A family member is booking a holiday and asked whether the beach resort or the mountain lodge looks better.",
    suggestedPerson: "your aunt Linda",
    labelA: "beach resort balcony",
    labelB: "mountain lodge room",
    promptA:
      "hotel balcony view: lounge chairs, small table with sunscreen bottle, railing overlooking turquoise ocean and palm trees, resort pool below, clear sunny sky, room door open to tidy bed glimpse, no people on balcony",
    promptB:
      "cozy lodge bedroom: wooden beams, stone fireplace with logs, large window showing pine forest and distant snow peaks, plaid blanket on queen bed, hiking boots by door, warm lamp light, no people",
    factsA: ["$210 per night", "includes breakfast buffet", "5-minute walk to the beach"],
    factsB: ["$175 per night", "free parking and ski shuttle in winter", "quiet forest trail behind the lodge"],
  },
  {
    theme: "choosing a home office setup",
    situation:
      "Your roommate is setting up a home office and wants your view on which workspace layout is better.",
    suggestedPerson: "your roommate Alex",
    labelA: "standing desk setup",
    labelB: "traditional desk setup",
    promptA:
      "home office corner with electric standing desk raised: external monitor on arm, ergonomic chair, plant on shelf, cable management tray, window with city view, yoga mat rolled nearby, clean minimal decor, no person",
    promptB:
      "home office with classic wooden desk: desk lamp, stacked paper trays, filing cabinet, bulletin board with pinned notes without readable text, bookshelf, comfortable fabric armchair, afternoon light, no person",
    factsA: ["desk about $450", "helps reduce back pain from sitting", "smaller footprint"],
    factsB: ["desk about $220", "more surface for spreading papers", "extra drawer storage included"],
  },
  {
    theme: "choosing a gym",
    situation:
      "Your friend is picking a gym membership and sent you photos of two facilities.",
    suggestedPerson: "your friend Chris",
    labelA: "large commercial gym",
    labelB: "small neighbourhood studio",
    promptA:
      "interior of a large commercial gym: rows of treadmills and weight machines, mirrors along wall, rubber flooring, water fountain, TV screens without readable text, high ceiling with fluorescent lights, empty equipment no people",
    promptB:
      "interior of a small boutique fitness studio: yoga mats on wood floor, kettlebells on rack, large windows to quiet street, fan, plants on sill, one spin bike, intimate low ceiling, warm lighting, no people",
    factsA: ["$55 per month", "open 24 hours", "many machines so rarely a wait"],
    factsB: ["$40 per month", "smaller classes included", "5-minute walk from home"],
  },
  {
    theme: "choosing a wedding venue",
    situation:
      "Your cousin is planning a wedding and asked you to compare these two venue options.",
    suggestedPerson: "your cousin Emma",
    labelA: "outdoor garden venue",
    labelB: "hotel ballroom",
    promptA:
      "outdoor wedding garden: white gazebo decorated with flowers, rows of white chairs on grass, string lights between trees, flower arch, pathway of petals, late-afternoon golden light, empty venue no guests",
    promptB:
      "indoor hotel ballroom: round tables with white tablecloths and centrepieces, chandelier, dance floor, stage for DJ booth shape, tall windows with drapes, carpeted floor, elegant lighting, no people",
    factsA: ["about $3,200 for 80 guests", "includes garden ceremony and tent backup", "more natural photos"],
    factsB: ["about $4,800 for 80 guests", "air-conditioned and weather-proof", "hotel rooms upstairs for guests"],
  },
  {
    theme: "choosing a computer",
    situation:
      "Your classmate needs a computer for school and wants help deciding between a laptop and a desktop setup.",
    suggestedPerson: "your classmate Sam",
    labelA: "portable laptop bundle",
    labelB: "desktop workstation",
    promptA:
      "study desk with open laptop showing blank screen, wireless mouse, headphones on hook, backpack by chair, coffee mug, window light, compact footprint on small desk, university poster shape on wall without text, no person",
    promptB:
      "study desk with desktop tower, dual monitors, mechanical keyboard, desk pad, external webcam on top, chair with lumbar pillow, more cables visible, larger desk surface, no person",
    factsA: ["about $950", "light to carry to campus", "battery lasts most of a school day"],
    factsB: ["about $1,100", "faster for video editing", "easier to upgrade parts later"],
  },
];
