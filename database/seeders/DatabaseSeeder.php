<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Category;
use App\Models\ContactMessage;
use App\Models\Coupon;
use App\Models\FamilyLink;
use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Order;
use App\Models\PickupSlot;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Notifications\PlatformNotification;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public const PRODUCT_PHOTOS = [
        'Heirloom Carrots' => 'carrots',
        'Vine Tomatoes' => 'tomatoes',
        'Baby Eggplant' => 'eggplant',
        'Green Bell Peppers' => 'bell-peppers',
        'Broccoli Crowns' => 'broccoli',
        'Sweet Corn' => 'sweet-corn',
        'Sindhri Mangoes' => 'sindhri-mangoes',
        'Bananas' => 'bananas',
        'Red Apples' => 'red-apples',
        'Sweet Grapes' => 'grapes',
        'Kinnow Tangerines' => 'tangerines',
        'Pears' => 'pears',
        'Fresh Cow Milk' => 'milk',
        'Farmhouse Cheese' => 'cheese',
        'Desi Butter (Makhan)' => 'butter',
        'Free-range Eggs' => 'free-range-eggs',
        'Country Sourdough' => 'sourdough',
        'Baguette' => 'baguette',
        'Butter Croissants' => 'croissants',
        'Sesame Bagels' => 'bagels',
        'Oat & Jaggery Cookies' => 'cookies',
        'Seasonal Fruit Pie' => 'fruit-pie',
        'Raw Beri Honey' => 'raw-honey',
        'Wildflower Honey' => 'wildflower-honey',
        'Mango Achar' => 'achar',
        'Coriander Bunch' => 'coriander',
        'Spinach (Palak)' => 'spinach',
        'Microgreens Mix' => 'microgreens',
        'Fresh Ginger' => 'ginger',
        'Green Chillies' => 'green-chillies',
        'Aged Basmati Rice' => 'basmati-rice',
        'Red Kidney Beans' => 'kidney-beans',
        'Roasted Peanuts' => 'peanuts',
        'Fresh Green Peas' => 'green-peas',
        'Desi Eggs' => 'desi-eggs',
        'Farm Chicken (whole)' => 'chicken',
        'Sunflower Stems' => 'sunflowers',
        'Tulip Bunch' => 'tulips',
        'Market Bouquet' => 'bouquet',
        'Potatoes' => 'potatoes',
        'Red Onions' => 'red-onions',
        'Garlic' => 'garlic',
        'Cucumbers' => 'cucumbers',
        'Button Mushrooms' => 'mushrooms',
        'Lemons' => 'lemons',
        'Chaunsa Mangoes' => 'chaunsa-mangoes',
        'Watermelon' => 'watermelon',
        'Cantaloupe' => 'cantaloupe',
        'Pineapple' => 'pineapple',
        'Tender Coconut' => 'coconut',
        'Strawberries' => 'strawberries',
        'Blueberries' => 'blueberries',
        'Mixed Vegetables Box' => 'veg-box',
    ];

    public function run(): void
    {
        mt_srand(7);

        $admin = User::create([
            'name' => 'Platform Admin', 'username' => 'admin', 'email' => 'admin@gleangrid.test',
            'phone' => '+92 370 4831994', 'address' => 'GleanGrid HQ, Qasimabad', 'city' => 'Hyderabad',
            'role' => User::ROLE_ADMIN, 'password' => Hash::make('Admin@123'), 'email_verified_at' => now(),
        ]);

        $markets = $this->markets();
        $categories = $this->categories();
        $farmers = $this->farmers($markets, $categories);
        $customers = $this->customers();

        $this->orders($customers, $farmers);
        $this->extras($admin, $customers, $farmers);
        $this->coupons($farmers);
        $this->coverPhotos();
        $this->call(FeatureSeeder::class);
    }

    private function coverPhotos(): void
    {
        foreach ([Market::class, FarmerProfile::class] as $model) {
            $model::query()->each(function ($row) {
                if (is_file(public_path("images/photos/{$row->slug}.webp"))) {
                    $row->update(['cover_image' => 'photo:'.$row->slug]);
                }
            });
        }
    }

    private function coupons(array $farmers): void
    {
        $by = collect($farmers)->keyBy('slug');
        $rows = [
            ['green-acres-organic-farm', 'GREEN10', '10% off your basket from Green Acres', 'percent', 10, 0, null, null, 3, null, null],
            ['hilltop-bakehouse', 'BREAD100', 'Rs 100 off a basket of Rs 800 or more', 'fixed', 100, 800, null, 100, 1, null, null],
            ['sindh-valley-orchards', 'MANGO15', 'Mango season: 15% off, up to Rs 300', 'percent', 15, 500, 300, 50, 1, null, now()->addWeeks(6)],
            ['kirthar-honey-co', 'HONEYWEEK', 'Starts next week', 'percent', 12, 0, null, null, 1, now()->addWeek(), now()->addWeeks(2)],
            ['thar-dairy-collective', 'EIDMILK', 'Eid special (ended)', 'fixed', 50, 300, null, null, 1, now()->subWeeks(4), now()->subWeeks(2)],
        ];
        foreach ($rows as $r) {
            if (! $farmer = $by->get($r[0])) {
                continue;
            }
            Coupon::create([
                'farmer_profile_id' => $farmer->id, 'code' => $r[1], 'description' => $r[2], 'type' => $r[3], 'value' => $r[4],
                'min_subtotal' => $r[5], 'max_discount' => $r[6], 'usage_limit' => $r[7], 'per_customer_limit' => $r[8],
                'starts_at' => $r[9], 'ends_at' => $r[10], 'is_active' => true,
            ]);
        }
    }

    private function markets(): array
    {
        $rows = [
            ['Qasimabad Sunday Farmers Market', 'Qasimabad', 'Main Qasimabad Road, near Naseem Nagar Chowk', 25.4056, 68.3265, [0], '08:00', '14:00',
                'Hyderabad’s best-loved Sunday market: seasonal produce, artisan bread and live cooking along Qasimabad’s main road.'],
            ['Latifabad Organic Bazaar', 'Latifabad', 'Unit No. 7, near Latifabad Sports Complex', 25.3702, 68.3683, [6, 0], '09:00', '15:00',
                'A weekend bazaar focused on pesticide-free growers, raw honey and small-batch dairy.'],
            ['Hirabad Evening Harvest Market', 'Hirabad', 'Hirabad Chowk, off Liaquat Colony Road', 25.4015, 68.3746, [5, 6], '16:00', '21:00',
                'An evening market with string lights, fresh-cut flowers and farm-to-table snacks.'],
            ['Auto Bhan Greens Market', 'Auto Bhan Road', 'Auto Bhan Road, near Sindh Museum', 25.3876, 68.3475, [3, 0], '07:00', '13:00',
                'Early-morning greens and vegetables straight from the farms of Tando Jam and Hatri.'],
            ['Paretabad Farmers Mela', 'Paretabad', 'Paretabad, near Pakka Qila Road', 25.4139, 68.3822, [2, 4, 6], '16:00', '21:00',
                'Three evenings a week of fruit, eggs and pantry staples for the families of old Hyderabad.'],
            ['Saddar Heritage Produce Market', 'Saddar', 'Near Shahi Bazaar, Saddar', 25.3925, 68.3689, [1, 2, 3, 4, 5, 6], '07:00', '19:00',
                'Hyderabad’s historic produce hub, open six days a week a few steps from the Shahi Bazaar.'],
            ['Tando Jam Countryside Market', 'Tando Jam', 'Near Sindh Agriculture University gate, Tando Jam', 25.4281, 68.5392, [4, 0], '07:00', '12:00',
                'Where the orchards and dairies around Tando Jam meet the city — mangoes, guavas and fresh milk.'],
        ];

        return collect($rows)->map(fn ($r) => Market::create([
            'name' => $r[0], 'slug' => Str::slug($r[0]), 'city' => $r[1], 'address' => $r[2].', Hyderabad, Sindh',
            'latitude' => $r[3], 'longitude' => $r[4], 'operating_days' => $r[5], 'opens_at' => $r[6], 'closes_at' => $r[7],
            'description' => $r[8], 'map_provider' => 'openstreetmap', 'is_active' => true,
        ]))->all();
    }

    private function categories(): array
    {
        $rows = [
            ['Vegetables', 'carrot', '#E2552C', 'Roots, gourds and everything for the handi.'],
            ['Fruits', 'mango', '#F2B33D', 'Orchard-ripe, never cold-stored for months.'],
            ['Herbs & Greens', 'herb', '#6FA35B', 'Picked at dawn, on your table by noon.'],
            ['Dairy & Eggs', 'glass_of_milk', '#8DB8D8', 'Fresh milk, butter, cheese and free-range eggs.'],
            ['Baked Goods', 'bread', '#C98B4E', 'Sourdough, kulcha and bakes from local ovens.'],
            ['Honey & Preserves', 'honey_pot', '#E0A526', 'Raw honey, jams, pickles and achar.'],
            ['Grains & Pulses', 'sheaf_of_rice', '#B5A26A', 'Heritage rice, daals and nuts.'],
            ['Flowers', 'sunflower', '#D96C8C', 'Seasonal stems and bouquets.'],
        ];

        return collect($rows)->mapWithKeys(fn ($r, $i) => [$r[0] => Category::create([
            'name' => $r[0], 'slug' => Str::slug($r[0]), 'icon' => $r[1], 'color' => $r[2], 'description' => $r[3], 'sort_order' => $i,
        ])])->all();
    }

    private function farmers(array $markets, array $categories): array
    {
        $rows = [
            ['Green Acres Organic Farm', 'Ali Raza', 'farmer@gleangrid.test', 'Chemical-free vegetables from the fields of Tando Jam since 2009.', [0, 3, 1], 'approved', 25.4312, 68.5205, [
                ['Heirloom Carrots', 'Vegetables', 180, 'kg', 40, 'carrot', 'Sweet, crunchy desi carrots — perfect for gajar ka halwa.'],
                ['Vine Tomatoes', 'Vegetables', 220, 'kg', 55, 'tomato', 'Sun-ripened on the vine, harvested the morning before market.'],
                ['Baby Eggplant', 'Vegetables', 160, 'kg', 25, 'eggplant', 'Small round baingan, ideal for bharta and achari baingan.'],
                ['Green Bell Peppers', 'Vegetables', 320, 'kg', 18, 'bell_pepper', 'Thick-walled shimla mirch with a clean crunch.'],
                ['Broccoli Crowns', 'Vegetables', 450, 'kg', 0, 'broccoli', 'Tight green crowns grown in the cool season.'],
                ['Sweet Corn', 'Vegetables', 60, 'piece', 80, 'ear_of_corn', 'Perfect for roasting — ask us for a pinch of lemon-masala.'],
            ]],
            ['Sindh Valley Orchards', 'Fatima Memon', 'fatima@gleangrid.test', 'Three generations of fruit growers from Tando Allahyar.', [1, 4, 6], 'approved', 25.4600, 68.7100, [
                ['Sindhri Mangoes', 'Fruits', 350, 'kg', 60, 'mango', 'The king of mangoes — fibreless, honey-sweet Sindhri.'],
                ['Bananas', 'Fruits', 160, 'dozen', 45, 'banana', 'Naturally ripened, no carbide, ever.'],
                ['Red Apples', 'Fruits', 380, 'kg', 30, 'red_apple', 'Crisp Kala Kulu apples, brought down from the north.'],
                ['Sweet Grapes', 'Fruits', 420, 'kg', 12, 'grapes', 'Seedless, sugary and great chilled.'],
                ['Kinnow Tangerines', 'Fruits', 240, 'dozen', 0, 'tangerine', 'Juicy winter kinnows — back in season soon.'],
                ['Pears', 'Fruits', 300, 'kg', 20, 'pear', 'Soft, fragrant nashpati.'],
            ]],
            ['Thar Dairy Collective', 'Kamran Baloch', 'kamran@gleangrid.test', 'Grass-fed milk from a cooperative of 40 small herders.', [0, 1, 6], 'approved', 25.3521, 68.4410, [
                ['Fresh Cow Milk', 'Dairy & Eggs', 220, 'litre', 70, 'glass_of_milk', 'Unprocessed whole milk, chilled within an hour of milking.'],
                ['Farmhouse Cheese', 'Dairy & Eggs', 1400, 'kg', 8, 'cheese_wedge', 'A mild aged cheese made in small wheels.'],
                ['Desi Butter (Makhan)', 'Dairy & Eggs', 900, 'pack', 15, 'butter', 'Hand-churned white butter in 500 g packs.'],
                ['Free-range Eggs', 'Dairy & Eggs', 420, 'dozen', 40, 'egg', 'From hens that roam the courtyard all day.'],
            ]],
            ['Hilltop Bakehouse', 'Sara Khan', 'sara@gleangrid.test', 'Slow-fermented breads baked in a wood-fired oven in Latifabad.', [0, 2, 1], 'approved', 25.3745, 68.3611, [
                ['Country Sourdough', 'Baked Goods', 650, 'loaf', 20, 'bread', '36-hour fermented loaf with a blistered crust.'],
                ['Baguette', 'Baked Goods', 350, 'piece', 25, 'baguette_bread', 'Crackly crust, open crumb. Baked at 4 am.'],
                ['Butter Croissants', 'Baked Goods', 280, 'piece', 30, 'croissant', 'Laminated with Thar Dairy butter.'],
                ['Sesame Bagels', 'Baked Goods', 200, 'piece', 24, 'bagel', 'Boiled then baked, New York style.'],
                ['Oat & Jaggery Cookies', 'Baked Goods', 550, 'box', 18, 'cookie', 'Box of 12, sweetened with gurr instead of sugar.'],
                ['Seasonal Fruit Pie', 'Baked Goods', 1600, 'piece', 6, 'pie', 'Whatever the orchards give us this week.'],
            ]],
            ['Kirthar Honey Co.', 'Imran Shah', 'imran@gleangrid.test', 'Wild honey from the Kirthar range, never heated or blended.', [1, 2, 5], 'approved', 25.7000, 67.6000, [
                ['Raw Beri Honey', 'Honey & Preserves', 2400, 'jar', 22, 'honey_pot', 'Rich, dark sidr honey in 500 g jars.'],
                ['Wildflower Honey', 'Honey & Preserves', 1800, 'jar', 30, 'honeybee', 'Light and floral, from spring blossoms.'],
                ['Mango Achar', 'Honey & Preserves', 650, 'jar', 26, 'jar', 'Grandma\'s recipe, cured in mustard oil.'],
            ]],
            ['Kotri Herb Garden', 'Ayesha Siddiqui', 'ayesha@gleangrid.test', 'Tender herbs and leafy greens from the Indus banks at Kotri, cut to order.', [3, 6, 0], 'approved', 25.3655, 68.3080, [
                ['Coriander Bunch', 'Herbs & Greens', 40, 'bunch', 120, 'herb', 'Fragrant dhania with roots on for longer life.'],
                ['Spinach (Palak)', 'Herbs & Greens', 90, 'bunch', 60, 'leafy_green', 'Tender leaves for saag and palak paneer.'],
                ['Microgreens Mix', 'Herbs & Greens', 350, 'box', 15, 'seedling', 'Radish, mustard and pea shoots.'],
                ['Fresh Ginger', 'Herbs & Greens', 520, 'kg', 14, 'ginger_root', 'Juicy young ginger, great for chai.'],
                ['Green Chillies', 'Herbs & Greens', 260, 'kg', 25, 'hot_pepper', 'Properly hot. You have been warned.'],
            ]],
            ['Indus Delta Farms', 'Bilal Ahmed', 'bilal@gleangrid.test', 'Heritage rice and pulses from Thatta.', [5, 4], 'approved', 24.7470, 67.9240, [
                ['Aged Basmati Rice', 'Grains & Pulses', 480, 'kg', 100, 'sheaf_of_rice', 'Aged 18 months for long, separate grains.'],
                ['Red Kidney Beans', 'Grains & Pulses', 420, 'kg', 40, 'beans', 'Plump lobia for rajma and salads.'],
                ['Roasted Peanuts', 'Grains & Pulses', 600, 'kg', 30, 'peanuts', 'Salted and roasted in sand, the old way.'],
                ['Fresh Green Peas', 'Grains & Pulses', 280, 'kg', 0, 'pea_pod', 'Sweet matar in the pod — seasonal.'],
            ]],
            ['Sunrise Poultry & Eggs', 'Usman Qureshi', 'usman@gleangrid.test', 'Pasture-raised desi eggs from Hatri.', [4, 5], 'approved', 25.4520, 68.4010, [
                ['Desi Eggs', 'Dairy & Eggs', 480, 'dozen', 50, 'egg', 'Small, rich-yolked desi eggs.'],
                ['Farm Chicken (whole)', 'Dairy & Eggs', 1100, 'piece', 10, 'chicken', 'Slow-grown desi murgh, cleaned on request.'],
            ]],
            ['Bloom & Stem', 'Hina Ali', 'hina@gleangrid.test', 'Seasonal flowers grown without chemical sprays.', [2, 0], 'approved', 25.4105, 68.3350, [
                ['Sunflower Stems', 'Flowers', 150, 'piece', 40, 'sunflower', 'Big, happy blooms — five-day vase life.'],
                ['Tulip Bunch', 'Flowers', 1200, 'bunch', 10, 'tulip', 'Ten stems of cool-season tulips.'],
                ['Market Bouquet', 'Flowers', 1500, 'piece', 12, 'bouquet', 'Hand-tied mix of whatever is blooming this week.'],
            ]],
            ['Jamshoro River Growers', 'Zainab Farooq', 'zainab@gleangrid.test', 'Everyday kitchen staples at fair prices.', [5, 4, 3], 'approved', 25.4300, 68.2810, [
                ['Potatoes', 'Vegetables', 90, 'kg', 150, 'potato', 'All-purpose aloo.'],
                ['Red Onions', 'Vegetables', 110, 'kg', 140, 'onion', 'Sharp, firm and long-keeping.'],
                ['Garlic', 'Vegetables', 480, 'kg', 30, 'garlic', 'Plump desi lehsan.'],
                ['Cucumbers', 'Vegetables', 120, 'kg', 45, 'cucumber', 'Crisp kheera for raita.'],
                ['Button Mushrooms', 'Vegetables', 380, 'pack', 16, 'mushroom', '250 g packs, grown indoors in Kotri.'],
                ['Lemons', 'Fruits', 280, 'kg', 35, 'lemon', 'Juicy, thin-skinned nimbu.'],
            ]],
            ['Mirpurkhas Mango House', 'Saad Jamali', 'saad@gleangrid.test', 'Tropical fruit from the orchards of Mirpurkhas.', [6, 1, 2], 'approved', 25.5270, 69.0110, [
                ['Chaunsa Mangoes', 'Fruits', 380, 'kg', 40, 'mango', 'Late-season Chaunsa, famously aromatic.'],
                ['Watermelon', 'Fruits', 70, 'kg', 60, 'watermelon', 'Sweet red flesh, sold whole.'],
                ['Cantaloupe', 'Fruits', 140, 'kg', 30, 'melon', 'Musky, sweet garma.'],
                ['Pineapple', 'Fruits', 450, 'piece', 15, 'pineapple', 'Golden and tangy.'],
                ['Tender Coconut', 'Fruits', 250, 'piece', 25, 'coconut', 'Full of sweet coconut water.'],
            ]],
            ['Coastal Greens', 'Nadia Hussain', 'nadia@gleangrid.test', 'Hydroponic lettuce and berries from Matiari.', [0], 'pending', 25.5970, 68.4460, [
                ['Strawberries', 'Fruits', 900, 'box', 20, 'strawberry', 'Hydroponic strawberries, 250 g box.'],
                ['Blueberries', 'Fruits', 1600, 'box', 10, 'blueberries', 'Rare local blueberries.'],
            ]],
            ['Quick Veg Traders', 'Rashid Mehmood', 'rashid@gleangrid.test', 'Wholesale vegetables.', [5], 'suspended', 25.3890, 68.3720, [
                ['Mixed Vegetables Box', 'Vegetables', 700, 'box', 10, 'basket', 'Assorted vegetables.'],
            ]],
        ];

        $password = Hash::make('Farmer@123');
        $categoryByName = $categories;

        return collect($rows)->map(function ($r, $i) use ($markets, $categoryByName, $password) {
            $user = User::create([
                'name' => $r[1], 'username' => Str::before($r[2], '@') === 'farmer' ? 'farmer' : Str::before($r[2], '@'),
                'email' => $r[2], 'phone' => '+92 3'.mt_rand(10, 49).' '.mt_rand(1000000, 9999999),
                'address' => 'Farm road, Hyderabad outskirts', 'city' => 'Hyderabad', 'role' => User::ROLE_FARMER,
                'password' => $password, 'email_verified_at' => now(),
            ]);

            $farmerMarkets = collect($r[4])->map(fn ($idx) => $markets[$idx]);
            $days = $farmerMarkets->flatMap(fn ($m) => $m->operating_days)->unique()->sort()->values()->all();

            $farmer = FarmerProfile::create([
                'user_id' => $user->id, 'stall_name' => $r[0], 'slug' => Str::slug($r[0]), 'contact_person' => $r[1],
                'phone' => $user->phone, 'email' => $r[2], 'address' => $user->address, 'tagline' => $r[3],
                'bio' => $r[3].' We bring our harvest to '.$farmerMarkets->pluck('name')->join(', ', ' and ').
                    '. Every item on this stall is grown or made by our own family and team — ask us anything at the stall.',
                'latitude' => $r[6], 'longitude' => $r[7], 'operating_days' => $days,
                'order_cutoff_hours' => [12, 18, 24][$i % 3], 'logo' => 'produce:'.$r[8][0][5],
                'status' => $r[5], 'approved_at' => $r[5] === 'approved' ? now()->subDays(90 - $i) : null,
                'status_reason' => $r[5] === 'suspended' ? 'Repeated customer complaints about quality.' : null,
            ]);

            foreach ($farmerMarkets as $k => $market) {
                $farmer->markets()->attach($market->id, ['stall_number' => chr(65 + $k).'-'.mt_rand(1, 40)]);
                foreach ($market->operating_days as $day) {
                    $open = CarbonImmutable::parse($market->opens_at);
                    $close = CarbonImmutable::parse($market->closes_at);
                    $mid = $open->addMinutes((int) ($open->diffInMinutes($close) / 2));
                    foreach ([[$open, $mid], [$mid, $close]] as [$from, $to]) {
                        PickupSlot::create([
                            'farmer_profile_id' => $farmer->id, 'market_id' => $market->id, 'day_of_week' => $day,
                            'starts_at' => $from->format('H:i'), 'ends_at' => $to->format('H:i'), 'capacity' => 15,
                        ]);
                    }
                }
            }

            foreach ($r[8] as $p) {
                Product::create([
                    'farmer_profile_id' => $farmer->id, 'category_id' => $categoryByName[$p[1]]->id,
                    'name' => $p[0], 'slug' => Str::slug($p[0].' '.$r[0]), 'description' => $p[6],
                    'price' => $p[2], 'unit' => $p[3], 'stock_quantity' => $p[4],
                    'weekly_quantity' => max($p[4], 20), 'image' => 'produce:'.$p[5], 'photo' => isset(self::PRODUCT_PHOTOS[$p[0]]) ? 'photo:products/'.self::PRODUCT_PHOTOS[$p[0]] : null,
                    'status' => $p[4] > 0 ? 'available' : 'sold_out', 'is_featured' => mt_rand(0, 3) === 0,
                ]);
            }

            return $farmer;
        })->all();
    }

    private function customers(): array
    {
        $password = Hash::make('Customer@123');
        $rows = [
            ['Ayesha Malik', 'customer', 'customer@gleangrid.test', 'House 14, Street 7, Qasimabad Phase 1'],
            ['Hamza Malik', 'hamza', 'hamza@gleangrid.test', 'House 14, Street 7, Qasimabad Phase 1'],
            ['Zara Ahmed', 'zara', 'zara@gleangrid.test', 'Flat 302, Citizen Colony'],
            ['Omar Farooq', 'omar', 'omar@gleangrid.test', 'Latifabad Unit 6'],
            ['Mariam Siddiqui', 'mariam', 'mariam@gleangrid.test', 'Hirabad, near Liaquat Colony'],
            ['Daniyal Qureshi', 'daniyal', 'daniyal@gleangrid.test', 'Wadhu Wah Road, Qasimabad'],
            ['Sana Iqbal', 'sana', 'sana@gleangrid.test', 'Naseem Nagar, Block B'],
            ['Faisal Khan', 'faisal', 'faisal@gleangrid.test', 'Hyderabad Cantonment'],
            ['Noor Fatima', 'noor', 'noor@gleangrid.test', 'Saddar, near Shahi Bazaar'],
            ['Arham Sheikh', 'arham', 'arham@gleangrid.test', 'Gulistan-e-Sajjad'],
            ['Iqra Javed', 'iqra', 'iqra@gleangrid.test', 'Latifabad Unit 11'],
            ['Kashif Raza', 'kashif', 'kashif@gleangrid.test', 'Auto Bhan Road'],
            ['Laiba Noor', 'laiba', 'laiba@gleangrid.test', 'Paretabad'],
            ['Spam Account', 'spammer', 'spam@gleangrid.test', 'Unknown'],
        ];

        return collect($rows)->map(fn ($r, $i) => User::create([
            'name' => $r[0], 'username' => $r[1], 'email' => $r[2], 'phone' => '+92 3'.mt_rand(10, 49).' '.mt_rand(1000000, 9999999),
            'address' => $r[3].', Hyderabad', 'city' => 'Hyderabad', 'role' => User::ROLE_CUSTOMER,
            'status' => $r[1] === 'spammer' ? 'inactive' : 'active', 'password' => $password, 'email_verified_at' => now(),
            'created_at' => now()->subDays(80 - $i * 4),
        ]))->all();
    }

    private function orders(array $customers, array $farmers): void
    {
        $approved = collect($farmers)->filter->isApproved()->values();
        $shoppers = collect($customers)->filter->isActive()->values();
        $comments = [
            5 => ['Absolutely fresh — you can taste the difference.', 'Best in Hyderabad, hands down. Will reorder every week.', 'Packed and ready exactly on time. Love this stall!', 'The kids finished it in one day.'],
            4 => ['Great quality, slightly pricey but worth it.', 'Very fresh. Pickup was smooth.', 'Good as always, just ran out of one item.'],
            3 => ['Decent, but a few pieces were bruised.', 'Okay quality this week.'],
            2 => ['Had to wait 20 minutes at pickup.'],
        ];
        $replies = ['Thank you so much! See you next week 🌱', 'Sorry about that — we\'ve added an extra check before packing.', 'Thanks for the kind words!'];

        for ($n = 0; $n < 170; $n++) {
            $farmer = $approved->random();
            $slot = $farmer->pickupSlots->random();
            $customer = $n < 26 ? $shoppers[0] : $shoppers->random();
            $upcoming = $n % 8 === 0;

            if ($upcoming) {
                $date = CarbonImmutable::today()->addDays(1);
                while ($date->dayOfWeek !== $slot->day_of_week) {
                    $date = $date->addDay();
                }
                $status = ['placed', 'accepted', 'ready', 'placed'][mt_rand(0, 3)];
            } else {
                $date = CarbonImmutable::today()->subDays(mt_rand(1, 60));
                while ($date->dayOfWeek !== $slot->day_of_week) {
                    $date = $date->subDay();
                }
                $roll = mt_rand(1, 100);
                $status = $roll <= 80 ? 'completed' : ($roll <= 90 ? 'cancelled' : 'declined');
            }

            $products = $farmer->products->where('price', '>', 0)->shuffle()->take(mt_rand(1, 3));
            $lines = $products->map(fn ($p) => [
                'product_id' => $p->id, 'product_name' => $p->name, 'unit' => $p->unit, 'unit_price' => $p->price,
                'quantity' => $q = mt_rand(1, 3), 'line_total' => $p->price * $q,
            ]);

            $placedAt = $upcoming ? now()->subHours(mt_rand(2, 48)) : $date->subDays(mt_rand(1, 3))->setTime(mt_rand(8, 22), mt_rand(0, 59));
            $pickupStart = $date->setTimeFromTimeString($slot->starts_at);

            $order = new Order([
                'code' => 'GG-'.strtoupper(Str::random(6)), 'customer_id' => $customer->id, 'farmer_profile_id' => $farmer->id,
                'market_id' => $slot->market_id, 'pickup_slot_id' => $slot->id, 'pickup_date' => $date->toDateString(),
                'pickup_starts_at' => $slot->starts_at, 'pickup_ends_at' => $slot->ends_at,
                'cutoff_at' => $pickupStart->subHours($farmer->order_cutoff_hours), 'status' => $status,
                'total_amount' => $lines->sum('line_total'), 'items_count' => $lines->sum('quantity'),
                'customer_note' => mt_rand(0, 4) === 0 ? 'Please pack the soft items separately.' : null,
                'accepted_at' => in_array($status, ['accepted', 'ready', 'completed']) ? $placedAt->addHours(2) : null,
                'ready_at' => in_array($status, ['ready', 'completed']) ? $pickupStart->subHour() : null,
                'completed_at' => $status === 'completed' ? $pickupStart->addMinutes(40) : null,
                'cancelled_at' => $status === 'cancelled' ? $placedAt->addHours(5) : null,
                'declined_at' => $status === 'declined' ? $placedAt->addHours(3) : null,
            ]);
            $order->created_at = $placedAt;
            $order->updated_at = $placedAt;
            $order->save();
            $order->items()->createMany($lines->all());

            if ($status === 'completed') {
                foreach ($lines as $line) {
                    Product::whereKey($line['product_id'])->increment('sold_count', $line['quantity']);
                }
                if (mt_rand(1, 100) <= 70 && ! ($customer->id === $shoppers[0]->id && $n < 6)) {
                    $rating = $approved->search($farmer) < 3 ? [5, 5, 5, 5, 4][mt_rand(0, 4)] : [5, 5, 5, 4, 4, 4, 3, 2][mt_rand(0, 7)];
                    $review = Review::create([
                        'user_id' => $customer->id, 'reviewable_type' => 'farmer', 'reviewable_id' => $farmer->id,
                        'order_id' => $order->id, 'rating' => $rating,
                        'comment' => $comments[$rating][array_rand($comments[$rating])],
                        'farmer_reply' => mt_rand(0, 2) === 0 ? $replies[array_rand($replies)] : null,
                        'replied_at' => null,
                    ]);
                    $review->forceFill(['created_at' => $order->completed_at, 'replied_at' => $review->farmer_reply ? $order->completed_at->addDay() : null])->saveQuietly();

                    $product = $products->first();
                    $pRating = min(5, $rating + mt_rand(0, 1));
                    Review::create([
                        'user_id' => $customer->id, 'reviewable_type' => 'product', 'reviewable_id' => $product->id,
                        'order_id' => $order->id, 'rating' => $pRating,
                        'comment' => $comments[$pRating][array_rand($comments[$pRating])],
                    ])->forceFill(['created_at' => $order->completed_at])->saveQuietly();
                }
            }
        }
    }

    private function extras(User $admin, array $customers, array $farmers): void
    {
        [$ayesha, $hamza, $zara] = $customers;
        $greenAcres = $farmers[0];

        FamilyLink::create(['owner_id' => $ayesha->id, 'member_id' => $hamza->id, 'status' => 'accepted']);
        FamilyLink::create(['owner_id' => $zara->id, 'member_id' => $ayesha->id, 'status' => 'pending']);

        foreach ([['farmer', $greenAcres->id], ['farmer', $farmers[3]->id], ['market', 1], ['market', 4]] as [$type, $id]) {
            $ayesha->favorites()->create(['favoritable_type' => $type, 'favoritable_id' => $id]);
        }
        foreach (Product::whereIn('slug', ['broccoli-crowns-green-acres-organic-farm', 'sindhri-mangoes-sindh-valley-orchards', 'raw-beri-honey-kirthar-honey-co', 'kinnow-tangerines-sindh-valley-orchards'])->get() as $p) {
            $ayesha->favorites()->create(['favoritable_type' => 'product', 'favoritable_id' => $p->id]);
        }

        Announcement::create(['user_id' => $admin->id, 'title' => 'Mango season is here 🥭',
            'body' => 'Sindhri and Chaunsa are arriving at the Tando Jam, Latifabad and Paretabad markets this week. Pre-order early — they sell out by noon!',
            'audience' => 'all', 'level' => 'success']);
        Announcement::create(['user_id' => $admin->id, 'title' => 'Update your pickup windows',
            'body' => 'Please review your pickup slots for the upcoming public holiday. Markets will run on normal hours.',
            'audience' => 'farmers', 'level' => 'warning']);

        $ayesha->notify(new PlatformNotification('order_ready', ['code' => 'GG-DEMO01', 'market' => 'Qasimabad Sunday Farmers Market', 'farmer' => $greenAcres->stall_name, 'date' => now()->toDateString()], route('customer.orders.index')));
        $ayesha->notify(new PlatformNotification('restock', ['product' => 'Sindhri Mangoes', 'farmer' => 'Sindh Valley Orchards'], route('products.index', ['q' => 'mango'])));
        $greenAcres->user->notify(new PlatformNotification('farmer_approved', [], route('farmer.dashboard')));

        foreach ([
            ['Bilal Hussain', 'bilal.h@example.com', 'Can I sell at the Qasimabad market?', 'I run a small organic farm in Thatta and would love to join. What is the process?'],
            ['Rabia Khan', 'rabia@example.com', 'Great platform!', 'Pre-ordering my weekly veggies saved me so much time. Please add more markets in Gulistan-e-Jauhar.'],
            ['Tariq Aziz', 'tariq@example.com', 'Pickup timing question', 'Is there any flexibility if I am 15 minutes late to my pickup window?'],
        ] as $m) {
            ContactMessage::create(['name' => $m[0], 'email' => $m[1], 'subject' => $m[2], 'message' => $m[3]]);
        }
    }
}
