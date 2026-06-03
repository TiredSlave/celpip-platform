import type { Task34SceneProfile } from "./speaking-image-style";

/**
 * Each profile = ONE scene with exactly 5 purposeful activities (simple, uncluttered).
 * Every focal point must be an obvious ACTION or INTERACTION (not idle waiting/reading alone)
 * so Task 3 has plenty to describe and Task 4 has clear next-step predictions.
 */
export const SPEAKING_TASK34_SCENE_PROFILES: Task34SceneProfile[] = [
  {
    setting: "outdoor community swimming pool on a bright sunny summer day",
    focalPoints: [
      "LEFT: Father kneeling helping a girl put on orange arm floaties on the pool deck",
      "CENTRE-LEFT: Lifeguard standing on a chair blowing a whistle toward the diving board",
      "CENTRE: Two boys mid-air jumping into the pool with a big splash",
      "CENTRE-RIGHT: Pool staff member mopping a puddle beside a yellow wet-floor sign",
      "RIGHT: Elderly woman eating an ice cream cone under a blue umbrella table",
    ],
    predictionHooks: [
      { id: "A", subject: "the father and daughter on the deck", visible_now: "putting on arm floaties", prediction_prompt: "whether the girl will jump in once the floaties are on" },
      { id: "B", subject: "the lifeguard on the chair", visible_now: "blowing a whistle toward the board", prediction_prompt: "whether swimmers will stop diving until the area is clear" },
      { id: "C", subject: "the boys jumping", visible_now: "splashing into the water", prediction_prompt: "whether they will swim to the ladder right after landing" },
      { id: "D", subject: "the staff member mopping", visible_now: "cleaning a puddle near the wet-floor sign", prediction_prompt: "whether someone will walk around the sign safely" },
      { id: "E", subject: "the elderly woman at the table", visible_now: "eating an ice cream cone", prediction_prompt: "whether she will move into the shade when the sun shifts" },
    ],
    backgroundHint: "chain-link fence and green trees",
    stabilityLines: [
      "father kneeling helping girl put on orange arm floaties on pool deck",
      "lifeguard on chair blowing whistle toward diving board",
      "two boys mid-air jumping into the pool with a big splash",
      "staff member mopping puddle beside yellow wet-floor sign",
      "elderly woman eating ice cream at umbrella table",
    ],
    slotCategories: [
      "helping_child",
      "teaching_demo",
      "sport_physical",
      "cleaning_maintenance",
      "eating_drinking",
    ],
  },
  {
    setting: "community recreation centre lobby and reception area",
    focalPoints: [
      "LEFT: Child trying swim goggles at a rental shelf while parent holds a stack of towels",
      "CENTRE-LEFT: Teenager doing leg stretches against the wall in track pants before swim practice",
      "CENTRE: Clerk scanning a membership card at the front desk counter",
      "CENTRE-RIGHT: Senior couple rallying a ping-pong ball on a small table in the corner",
      "RIGHT: Worker placing an orange safety cone beside a mop bucket near the pool entrance",
    ],
    predictionHooks: [
      { id: "A", subject: "the child at the goggle shelf", visible_now: "trying on swim goggles", prediction_prompt: "whether they will pick a pair that fits before heading to the pool" },
      { id: "B", subject: "the teenager stretching", visible_now: "warming up against the wall", prediction_prompt: "whether they will join a lane swim when the whistle blows" },
      { id: "C", subject: "the clerk at the desk", visible_now: "scanning a membership card", prediction_prompt: "whether the next person in line will need a new card printed" },
      { id: "D", subject: "the seniors at ping-pong", visible_now: "rallying the ball together", prediction_prompt: "whether the ball will roll under a bench on the next shot" },
      { id: "E", subject: "the worker with the cone", visible_now: "marking a wet patch near the pool doors", prediction_prompt: "whether swimmers will walk around the cone" },
    ],
    backgroundHint: "recreation centre interior, glass doors to parking lot",
  },
  {
    setting: "public library main floor during after-school hours",
    focalPoints: [
      "LEFT: Student and classmate leaning over a laptop, one pointing at the screen",
      "CENTRE-LEFT: Librarian stamping a tall stack of books while a patron waits with an armload of returns",
      "CENTRE: Newcomer family showing pamphlets to staff who gesture toward a program poster",
      "CENTRE-RIGHT: Toddler handing a picture book to a grandmother seated on a reading rug",
      "RIGHT: Volunteer lifting books from a cart and passing them to a librarian reshelving",
    ],
    predictionHooks: [
      { id: "A", subject: "the students at the laptop", visible_now: "working together on an assignment", prediction_prompt: "whether they will finish before the library closes" },
      { id: "B", subject: "the librarian stamping books", visible_now: "processing returns with a waiting patron", prediction_prompt: "whether a long hold queue will form at the desk" },
      { id: "C", subject: "the family at information", visible_now: "asking about programs", prediction_prompt: "whether they will register for an evening language class" },
      { id: "D", subject: "the toddler and grandmother", visible_now: "sharing a picture book", prediction_prompt: "whether the parent will come back from the stacks soon" },
      { id: "E", subject: "the volunteer and librarian", visible_now: "shelving returns together", prediction_prompt: "whether they will need help when the cart is full" },
    ],
    backgroundHint: "tall bookshelves and windows showing a bus stop outside",
  },
  {
    setting: "indoor skating rink spectator area beside the ice",
    focalPoints: [
      "LEFT: Parent lacing a child's skate while the child steadies themselves on the bench",
      "CENTRE-LEFT: Friend handing a cup of hot chocolate to a skater still wearing gloves",
      "CENTRE: Coach blowing a whistle and gesturing as young skaters weave through orange cones",
      "CENTRE-RIGHT: Rental clerk buckling a helmet onto a customer leaning over the counter",
      "RIGHT: Zamboni driver steering the resurfacer across the ice while skaters wait at the gate",
    ],
    predictionHooks: [
      { id: "A", subject: "the parent and child on the bench", visible_now: "getting skates on", prediction_prompt: "whether the child will step onto the ice in the next few minutes" },
      { id: "B", subject: "the friends with hot chocolate", visible_now: "sharing a drink at the side", prediction_prompt: "whether they will skate after warming up" },
      { id: "C", subject: "the coach on the ice", visible_now: "running a drill near cones", prediction_prompt: "whether the practice group will line up at the bench soon" },
      { id: "D", subject: "the rental clerk", visible_now: "fitting a helmet", prediction_prompt: "whether the next customer will need a larger size" },
      { id: "E", subject: "the Zamboni driver", visible_now: "resurfacing the ice", prediction_prompt: "whether public skating will start right after the ice is finished" },
    ],
    backgroundHint: "rink boards, community hall doors, snow visible through windows",
  },
  {
    setting: "transit bus shelter on a rainy evening",
    focalPoints: [
      "LEFT: Commuter tapping the electronic departure screen while glancing at an approaching bus",
      "CENTRE-LEFT: Student lifting an elderly woman's suitcase onto the curb as she holds an umbrella",
      "CENTRE: Cyclist securing a bike to the shelter rack and shaking rain off a jacket",
      "CENTRE-RIGHT: Woman juggling grocery bags while a stranger reaches to steady a slipping bag",
      "RIGHT: Bus driver opening doors as passengers step up from the wet sidewalk",
    ],
    predictionHooks: [
      { id: "A", subject: "the commuter at the screen", visible_now: "checking if the bus is arriving", prediction_prompt: "whether they will run to board before it leaves" },
      { id: "B", subject: "the student and elderly woman", visible_now: "loading luggage together", prediction_prompt: "whether the driver will lower the bus for easier boarding" },
      { id: "C", subject: "the cyclist", visible_now: "locking the bike in the rain", prediction_prompt: "whether they will load the bike onto the bus rack" },
      { id: "D", subject: "the woman with groceries", visible_now: "being helped with a heavy bag", prediction_prompt: "whether she will offer to share the umbrella afterward" },
      { id: "E", subject: "the bus at the stop", visible_now: "boarding passengers", prediction_prompt: "whether the shelter will empty once the doors close" },
    ],
    backgroundHint: "wet street, apartment lights in the distance, rain on the shelter roof",
  },
  {
    setting: "medical clinic waiting room",
    focalPoints: [
      "LEFT: Receptionist answering a phone while typing and handing a clipboard to a new arrival",
      "CENTRE-LEFT: Nurse pushing a wheelchair and guiding a patient toward the hallway",
      "CENTRE: Medical assistant helping a patient step off a scale while reading the display",
      "CENTRE-RIGHT: Parent wiping a child's nose while rocking a stroller with the other hand",
      "RIGHT: Child knocking over a block tower while a parent lunges to catch the falling blocks",
    ],
    predictionHooks: [
      { id: "A", subject: "the receptionist", visible_now: "checking in a patient", prediction_prompt: "whether the waiting line will grow at the desk" },
      { id: "B", subject: "the nurse with the wheelchair", visible_now: "moving a patient to an exam room", prediction_prompt: "whether the hallway will clear for them to pass" },
      { id: "C", subject: "the patient on the scale", visible_now: "finishing a weigh-in", prediction_prompt: "whether they will be called in for their appointment next" },
      { id: "D", subject: "the parent and child in the stroller", visible_now: "comforting a sick child", prediction_prompt: "whether the child will need to see the nurse today too" },
      { id: "E", subject: "the child with blocks", visible_now: "playing until the tower falls", prediction_prompt: "whether the parent will rebuild the tower to keep the child calm" },
    ],
    backgroundHint: "hallway to exam rooms, water cooler, wall clock",
  },
  {
    setting: "apartment building lobby on a moving day",
    focalPoints: [
      "LEFT: Building manager pressing elevator call buttons while a tenant compares two floor numbers on a phone",
      "CENTRE-LEFT: Mover steering a dolly stacked with labelled boxes through the lobby",
      "CENTRE: Delivery driver rolling a hand truck stacked with flat-pack furniture cartons",
      "CENTRE-RIGHT: Neighbour walking a small dog on a leash while propping the lobby door open with a foot",
      "RIGHT: Janitor polishing the brass door handle with a cloth on a step stool",
    ],
    predictionHooks: [
      { id: "A", subject: "the manager and tenant", visible_now: "waiting for the service elevator", prediction_prompt: "whether the elevator will arrive before more boxes pile up" },
      { id: "B", subject: "the mover with the dolly", visible_now: "bringing boxes through the lobby", prediction_prompt: "whether they will need to wait for the elevator doors" },
      { id: "C", subject: "the delivery driver", visible_now: "unloading flat-pack cartons", prediction_prompt: "whether the resident will sign for the delivery upstairs" },
      { id: "D", subject: "the neighbour with the dog", visible_now: "holding the door open mid-walk", prediction_prompt: "whether the dog will pull toward the delivery boxes" },
      { id: "E", subject: "the janitor on the stool", visible_now: "polishing the door handle", prediction_prompt: "whether movers will bump the stool while passing" },
    ],
    backgroundHint: "mail slots, elevator doors, potted plant by the entrance",
  },
  {
    setting: "school gymnasium during a community information fair",
    focalPoints: [
      "LEFT: Volunteer explaining a brochure to a parent who points at a signup sheet",
      "CENTRE-LEFT: Child cutting paper with safety scissors while an adult steadies the sheet",
      "CENTRE: Nurse wrapping a blood pressure cuff while a senior rolls up a sleeve",
      "CENTRE-RIGHT: Teenager handing flyers to a booth volunteer who restocks a table",
      "RIGHT: Principal adjusting a microphone while an assistant tests the projector screen",
    ],
    predictionHooks: [
      { id: "A", subject: "the volunteer and parent", visible_now: "discussing a program signup", prediction_prompt: "whether the parent will register before leaving" },
      { id: "B", subject: "the child at crafts", visible_now: "cutting paper with help", prediction_prompt: "whether they will show the finished craft on stage" },
      { id: "C", subject: "the senior at screening", visible_now: "having blood pressure checked", prediction_prompt: "whether they will visit another booth afterward" },
      { id: "D", subject: "the teenager with flyers", visible_now: "restocking a booth", prediction_prompt: "whether they will run out of flyers before the fair ends" },
      { id: "E", subject: "the principal at the microphone", visible_now: "preparing to speak", prediction_prompt: "whether the crowd will gather when the announcement starts" },
    ],
    backgroundHint: "raised basketball hoops, rows of booths, gym bleachers with coats",
  },
  {
    setting: "waterfront park path on a summer afternoon",
    focalPoints: [
      "LEFT: Cyclist ringing a bell and slowing as a pedestrian pulls a leashed dog to the side",
      "CENTRE-LEFT: Family unpacking sandwiches from a cooler onto a picnic blanket",
      "CENTRE: City worker lifting a garbage bag out of a bin while a jogger passes by",
      "CENTRE-RIGHT: Couple pointing at sailboats while a toddler throws bread toward ducks",
      "RIGHT: Dog pulling on a leash while the owner jogs in place tying a shoelace",
    ],
    predictionHooks: [
      { id: "A", subject: "the cyclist and pedestrian", visible_now: "sharing the path safely", prediction_prompt: "whether they will pass without stopping traffic" },
      { id: "B", subject: "the picnic family", visible_now: "setting out food on the grass", prediction_prompt: "whether seagulls will come near the blanket" },
      { id: "C", subject: "the city worker", visible_now: "emptying the bin", prediction_prompt: "whether the path will look cleaner before the evening crowd" },
      { id: "D", subject: "the couple and toddler", visible_now: "feeding ducks and watching boats", prediction_prompt: "whether the toddler will run toward the water's edge" },
      { id: "E", subject: "the jogger and dog", visible_now: "pausing to tie a shoe", prediction_prompt: "whether the dog will drag them forward when they start again" },
    ],
    backgroundHint: "lake, trees, distant playground",
  },
  {
    setting: "busy downtown sidewalk outside small shops",
    focalPoints: [
      "LEFT: Street musician strumming guitar while a passerby drops a coin into the tip case",
      "CENTRE-LEFT: Food cart vendor wrapping a snack and handing it to a waiting customer",
      "CENTRE: Courier scanning a package on a handheld device before placing it on a scooter",
      "CENTRE-RIGHT: Shopper trying on sunglasses while a friend holds up two sale bags for comparison",
      "RIGHT: Worker on a short ladder passing a light bulb up to another worker fixing the awning",
    ],
    predictionHooks: [
      { id: "A", subject: "the street musician", visible_now: "playing as someone tips", prediction_prompt: "whether a crowd will gather to listen" },
      { id: "B", subject: "the food cart vendor", visible_now: "serving a customer", prediction_prompt: "whether a line will form at the cart" },
      { id: "C", subject: "the courier", visible_now: "scanning before riding off", prediction_prompt: "whether they will reach the next delivery on time" },
      { id: "D", subject: "the shoppers at the rack", visible_now: "comparing sunglasses and bags", prediction_prompt: "whether they will buy something before leaving" },
      { id: "E", subject: "the workers on the ladder", visible_now: "replacing the awning light", prediction_prompt: "whether pedestrians will walk around the ladder" },
    ],
    backgroundHint: "storefronts, parked cars, street trees",
  },
  {
    setting: "airport departure gate during holiday travel",
    focalPoints: [
      "LEFT: Family handing boarding passes to an agent while lifting carry-on bags onto the scale",
      "CENTRE-LEFT: Parents buckling a toddler into a stroller while the child reaches for a toy",
      "CENTRE: Gate agent scanning a ticket and waving a passenger toward the jet bridge",
      "CENTRE-RIGHT: Teenager sharing headphones with a younger sibling watching a tablet together",
      "RIGHT: Flight attendant helping an elderly passenger stand up and gather a walking cane",
    ],
    predictionHooks: [
      { id: "A", subject: "the family at the gate", visible_now: "checking bags and passes", prediction_prompt: "whether they will board in the family pre-board group" },
      { id: "B", subject: "the parents and toddler", visible_now: "settling into the stroller", prediction_prompt: "whether the child will stay calm during boarding" },
      { id: "C", subject: "the gate agent", visible_now: "scanning tickets at the podium", prediction_prompt: "whether boarding will begin when the plane is ready" },
      { id: "D", subject: "the teenagers with the tablet", visible_now: "sharing a video while waiting", prediction_prompt: "whether they will hear the boarding call in time" },
      { id: "E", subject: "the flight attendant and elderly passenger", visible_now: "getting ready to board", prediction_prompt: "whether they will need extra time in the jet bridge line" },
    ],
    backgroundHint: "rows of seats, large window with parked aircraft",
  },
  {
    setting: "supermarket checkout area on a Saturday morning",
    focalPoints: [
      "LEFT: Cashier scanning groceries while a customer packs reusable bags",
      "CENTRE-LEFT: Toddler reaching for candy on a rack while parent unloads items onto the belt",
      "CENTRE: Store manager waving a cashier to open an empty checkout lane",
      "CENTRE-RIGHT: Stock clerk lifting bread loaves into a shopper's cart",
      "RIGHT: Senior showing a long receipt to a clerk and pointing at an item",
    ],
    predictionHooks: [
      { id: "A", subject: "the cashier and customer", visible_now: "scanning and packing groceries", prediction_prompt: "whether the next customer will need a price check" },
      { id: "B", subject: "the toddler and parent at the belt", visible_now: "reaching for candy while unloading", prediction_prompt: "whether the parent will move the child away from the rack" },
      { id: "C", subject: "the manager", visible_now: "opening another lane", prediction_prompt: "whether the line will move faster after the lane opens" },
      { id: "D", subject: "the stock clerk", visible_now: "loading bread into a cart", prediction_prompt: "whether another shopper will ask for help finding an item" },
      { id: "E", subject: "the senior and clerk", visible_now: "checking a receipt and cart item", prediction_prompt: "whether they will return an item to the shelf" },
    ],
    backgroundHint: "checkout lanes, entrance doors, floral display in background",
    stabilityLines: [
      "cashier scanning groceries customer packing reusable bags",
      "toddler reaching for candy rack parent unloading onto belt",
      "manager waving cashier to open empty checkout lane",
      "stock clerk lifting bread loaves into shopper cart",
      "senior showing receipt to clerk pointing at cart item",
    ],
    slotCategories: [
      "paying_serving",
      "playing_games",
      "teaching_demo",
      "carrying_moving",
      "shopping_trying",
    ],
  },
  {
    setting: "indoor children's science museum exhibit hall (not outdoor)",
    focalPoints: [
      "LEFT: Teacher and child pressing a red button on a tabletop volcano model with white foam bubbling up",
      "CENTRE-LEFT: Boy pedalling a yellow stationary bike wired to a glowing light bulb on a stand",
      "CENTRE: Two children stacking large colourful foam blocks into a wobbly tower on the floor",
      "CENTRE-RIGHT: Museum guide dropping metal keys onto a magnet table where they stick upright",
      "RIGHT: Parent making a giant soap bubble around a child with a hoop wand at a water table",
    ],
    predictionHooks: [
      { id: "A", subject: "the teacher and volcano station", visible_now: "running a hands-on demo", prediction_prompt: "whether the next class group will line up for a turn" },
      { id: "B", subject: "the boy on the bicycle", visible_now: "pedalling to light the bulb", prediction_prompt: "whether the light will stay on when he stops" },
      { id: "C", subject: "the children with foam blocks", visible_now: "building a tower together", prediction_prompt: "whether the tower will fall when they add one more block" },
      { id: "D", subject: "the guide at the magnet table", visible_now: "demonstrating magnetic objects", prediction_prompt: "whether the children will try to pull all the magnets off at once" },
      { id: "E", subject: "the parent and bubble hoop", visible_now: "making a giant bubble", prediction_prompt: "whether the bubble will pop when the child moves" },
    ],
    backgroundHint: "indoor museum hall, colourful wall posters, hanging planet mobile, NOT outdoor volcanoes",
  },
  {
    setting: "outdoor community festival in a town square",
    focalPoints: [
      "LEFT: Face painter finishing a butterfly design while the child laughs and looks in a mirror",
      "CENTRE-LEFT: Barbecue volunteer flipping burgers and handing a plate to a waiting customer",
      "CENTRE: Teenage guitarist tuning strings while a drummer counts in on a small stage",
      "CENTRE-RIGHT: Craft vendor wrapping a scarf around a shopper's shoulders at a folding table",
      "RIGHT: Elderly couple dancing while a toddler claps and a parent records on a phone",
    ],
    predictionHooks: [
      { id: "A", subject: "the face painter and child", visible_now: "finishing a design", prediction_prompt: "whether the child will run to show friends the painting" },
      { id: "B", subject: "the barbecue volunteer", visible_now: "serving food from the grill", prediction_prompt: "whether a long food line will form at the tent" },
      { id: "C", subject: "the band on stage", visible_now: "warming up together", prediction_prompt: "whether people will gather when the music starts" },
      { id: "D", subject: "the craft vendor and shopper", visible_now: "trying on a scarf", prediction_prompt: "whether the shopper will buy it before leaving" },
      { id: "E", subject: "the dancing couple", visible_now: "moving to the music", prediction_prompt: "whether more couples will join them on the pavement" },
    ],
    backgroundHint: "festival tents, string lights, Canadian flags",
  },
];

/** Scenes with short Stability lines — pool and checkout only (avoid museum/library/rink). */
export function getTask34TemplateScene(template: "pool" | "supermarket"): Task34SceneProfile {
  if (template === "supermarket") {
    const scene = SPEAKING_TASK34_SCENE_PROFILES.find((s) =>
      /supermarket checkout/i.test(s.setting),
    );
    if (scene) return scene;
  }
  return SPEAKING_TASK34_SCENE_PROFILES[0];
}
