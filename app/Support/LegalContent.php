<?php

namespace App\Support;

class LegalContent
{
    public const UPDATED = '2026-09-27';

    public static function page(string $key): array
    {
        $c = config('gleangrid.contact');

        return match ($key) {
            'terms' => [
                'title' => 'Terms of Use',
                'intro' => 'These terms are the ground rules for using GleanGrid, the pre-order platform for farmers markets in Hyderabad, Sindh. By creating an account, placing a pre-order or listing produce you agree to them. We have kept them as short and plain as a legal page can be.',
                'sections' => [
                    ['Who we are', [
                        "GleanGrid (“we”, “us”) is operated from {$c['address']}. You can reach us at {$c['email']} or {$c['phone']}. “You” means anyone who visits the site, whether as a guest, a customer, a farmer or a household member linked to a customer.",
                    ]],
                    ['What GleanGrid is — and isn’t', [
                        'GleanGrid is a meeting place. Farmers list what they will bring to market; customers reserve it online and collect it in person during a pickup window. The sale itself is a contract between you and the farmer.',
                        ['list', [
                            'We do not buy, grow, store, transport, inspect or resell produce.',
                            'We do not process payments, hold money or take a commission. Every order is paid for at the stall, directly to the farmer.',
                            'We do not deliver. GleanGrid is pickup-only (see the Pickup & Delivery Policy).',
                        ]],
                    ]],
                    ['Your account', [
                        ['list', [
                            'Give accurate details. Your name and phone number help farmers recognise you at pickup; your e-mail receives codes and order updates and must be verified before you can order or list.',
                            'Keep your password private. You are responsible for activity on your account until you tell us it has been compromised. Changing your password signs every other device out.',
                            'One person per account. Households link accounts with Family sharing instead of sharing a password.',
                            'You must be at least 16, or use GleanGrid with a parent or guardian’s permission.',
                            'You can close your account at any time by writing to us. Open pre-orders are cancelled first so farmers are not left holding stock.',
                        ]],
                    ]],
                    ['Pre-orders', [
                        'A pre-order is a reservation, not a purchase. When you check out, the stock is held for you and a pickup window is booked. No money is taken.',
                        ['list', [
                            'Each farmer sets a cut-off (between 1 and 168 hours before the pickup window). Until then you can modify or cancel the order in one tap, free of charge.',
                            'After the cut-off the farmer has picked and packed for you, so the order is locked.',
                            'A basket with items from several farmers becomes one separate pre-order per farmer, each with its own window.',
                            'Prices, units and stock shown at checkout are recalculated on our server when you confirm — the price on your order is the price you pay at the stall.',
                            'A farmer may decline an order (for example after hail, a poor harvest or illness). You are told immediately and owe nothing.',
                        ]],
                        'Please turn up. Repeated no-shows hurt small growers who set produce aside for you. Once a pickup window has passed, the farmer can mark the order as not collected and the produce goes back on sale. A set number of no-shows within a rolling period (by default 3 in 60 days, adjustable by our team) pauses pre-ordering until the account is reviewed.',
                    ]],
                    ['Farmers and listings', [
                        'New stalls are reviewed by our team before they can list. Approval confirms a real stall exists at a real market; it is not a certification of organic status, food safety, weights and measures or licences — those responsibilities stay with each farmer under Pakistani law.',
                        ['list', [
                            'Describe produce honestly: name, price, unit, quantity, photos and growing practices.',
                            'Keep stock and pickup windows up to date; mark items sold out rather than declining orders.',
                            'Honour accepted orders and the prices shown on them.',
                            'Treat customers’ personal details as confidential and use them only to fulfil their orders.',
                        ]],
                        'We may hide listings, suspend stalls or remove reviews that are misleading, unsafe, abusive or unlawful, and will tell the account holder why.',
                    ]],
                    ['Reviews', [
                        'Reviews can only be left on a completed order, so every rating comes from a real pickup. Keep them honest, first-hand and respectful: no personal data, hate, threats or advertising. Farmers can reply publicly. Our moderators may hide reviews that break these rules; we never edit what you wrote or remove fair criticism.',
                    ]],
                    ['Coupons', [
                        'Farmers and our team may publish coupon codes. A coupon applies only to the stall or scope it was issued for, within its dates and usage limits, and is checked again when you confirm. Coupons have no cash value, cannot be exchanged, and a coupon used on an order that is cancelled or declined is returned to you automatically.',
                    ]],
                    ['Fair use', [
                        ['list', [
                            'No scraping, automated ordering, stock-hoarding or attempts to get around rate limits, bot protection or security controls.',
                            'No fake accounts, fake reviews, impersonation or harassment of farmers, customers or staff.',
                            'No uploading anything you do not have the rights to, or anything illegal or harmful.',
                            'Report security issues responsibly to us instead of exploiting them.',
                        ]],
                    ]],
                    ['Content and intellectual property', [
                        'The GleanGrid name, logo, design and illustrations belong to their authors. The source code is published under the MIT licence. You keep ownership of photos and text you upload, and give us a licence to display them on GleanGrid for as long as they are listed.',
                    ]],
                    ['Availability and liability', [
                        'We work hard to keep GleanGrid accurate and online, but market days, weather and harvests are unpredictable and software fails sometimes. The service is provided “as is”.',
                        'To the extent the law allows, GleanGrid is not liable for the quality, safety or legality of produce, for missed pickups, or for losses arising from a transaction between a customer and a farmer. Nothing in these terms limits rights you have as a consumer under the laws of Pakistan or the Sindh Consumer Protection Act, 2014.',
                    ]],
                    ['Changes and governing law', [
                        'If these terms change in a meaningful way we post an announcement on the site before the change takes effect. These terms are governed by the laws of Pakistan, and the courts of Hyderabad, Sindh have jurisdiction.',
                        "Questions? Write to {$c['email']} or call {$c['phone']}.",
                    ]],
                ],
            ],

            'privacy' => [
                'title' => 'Privacy Policy',
                'intro' => 'We collect as little as we can, use it only to run GleanGrid, and never sell or rent it. This page explains exactly what we hold, why, who can see it and how to get it deleted.',
                'sections' => [
                    ['What we collect', [
                        ['list', [
                            'Account details: name, username, e-mail address, phone number, address, profile photo (optional) and preferred language.',
                            'For farmers: stall name, contact person, stall location and map pin, markets you trade at, product photos and descriptions.',
                            'Orders: what you reserved, from whom, pickup windows, coupon codes used and status history.',
                            'Things you create: reviews, farmer replies, favourites, restock alerts, family links and messages sent through the contact form.',
                            'Security records: sign-in times, IP address and a coarse device description (for example “Chrome on Android”) used to spot suspicious sign-ins and to let you sign other devices out.',
                            'Location — only if you press “Near me” or ask for directions. It is used in your browser to sort markets and draw a route, and is not stored on our servers.',
                        ]],
                        'We never collect card or bank details — payment happens in person at the stall.',
                    ]],
                    ['How we use it', [
                        ['list', [
                            'To run your orders: the farmer you order from sees your name, phone number and order so they can prepare it and recognise you.',
                            'To send the messages you need: verification codes, order updates, pickup reminders, restock alerts and security alerts. We do not send marketing e-mail.',
                            'To keep the platform safe: rate limiting, bot protection, fraud prevention and moderation.',
                            'To produce anonymous, aggregated market statistics (for example “most pre-ordered produce this week”).',
                            'To answer you when you contact us.',
                        ]],
                        'Our legal bases are performing the service you asked for, keeping it secure (legitimate interest) and meeting legal obligations.',
                    ]],
                    ['Who else sees it', [
                        'Only the farmers you order from, the household members you link, and our small team when they need to help you or moderate content. We use a few service providers (processors) who handle data only on our instructions:',
                        ['list', [
                            'Resend — sends and receives our e-mail.',
                            'OpenStreetMap tile servers and the OSRM routing service — draw maps and directions (they receive your IP address like any website you load).',
                            'Google reCAPTCHA — tells people from bots on sign-up, sign-in, contact and password forms. It is subject to Google’s Privacy Policy and Terms.',
                            'Google Fonts — serves the typefaces used on the site.',
                            'Our hosting provider — stores the database and files.',
                        ]],
                        'We disclose data to authorities only when Pakistani law requires it.',
                    ]],
                    ['Cookies and local storage', [
                        'We use only what the site needs: a session cookie to keep you signed in, an XSRF cookie to protect forms against forgery, and your browser’s local storage to remember your basket, language and light/dark theme. No advertising, analytics or cross-site tracking cookies.',
                    ]],
                    ['How long we keep it', [
                        ['list', [
                            'Account data: while your account is open.',
                            'Orders: two years, for farmers’ bookkeeping and dispute handling, then anonymised.',
                            'Sign-in records and IP addresses: 90 days.',
                            'Contact messages: 12 months after the conversation ends.',
                            'Verification and reset codes: until used or expired (minutes, not days).',
                            'Backups roll over within 30 days, so deleted data disappears from them too.',
                        ]],
                    ]],
                    ['Your rights', [
                        'You can view and correct your details on your profile at any time and sign out of other devices from Sign-in & security. Under Profile → Your data you can download a complete copy of your data as a JSON file, and delete your account yourself, instantly. You can also ask us to restrict or object to a use of your data by writing from your account e-mail; we reply within 30 days. Deleting an account cancels open pre-orders and removes your profile, favourites and family links; completed orders are anonymised rather than deleted so farmers’ records stay correct.',
                    ]],
                    ['Security', [
                        'Passwords are hashed with Argon2id, a slow, memory-hard algorithm — nobody at GleanGrid can read them. Traffic is encrypted with HTTPS and HSTS, sessions are encrypted, every page carries a strict Content Security Policy, forms are protected against forgery and bots, uploads are re-encoded before storage, and sign-ins from a new device trigger an e-mail alert. No system is perfect: if we ever suffer a breach affecting you, we will tell you promptly.',
                    ]],
                    ['Children', [
                        'GleanGrid is not directed at children under 16 and we do not knowingly collect their data. If you believe a child has created an account, contact us and we will remove it.',
                    ]],
                    ['Changes and contact', [
                        "We will announce material changes on the site before they apply. Privacy questions go to {$c['email']}. GleanGrid is operated from {$c['address']}.",
                    ]],
                ],
            ],

            'returns' => [
                'title' => 'Returns, Refunds & Cancellations',
                'intro' => 'Fresh food doesn’t travel back to the farm, so our approach is simple: you can cancel free until the cut-off, you check everything at the stall before you pay, and you speak up quickly if something is wrong.',
                'sections' => [
                    ['The short version', [
                        ['list', [
                            'Cancel or change any pre-order free until the farmer’s cut-off time shown on the order.',
                            'Nothing is paid online, so there is never a card refund to wait for.',
                            'At pickup, you pay only for the items you accept.',
                            'Problem after you got home? Tell us within 24 hours with your order code and a photo.',
                        ]],
                    ]],
                    ['Cancelling or changing a pre-order', [
                        'Open the order under My orders and choose Modify or Cancel. Both are available while the order is “placed” or “accepted” and the cut-off has not passed. The cut-off is set by each farmer (usually 12–24 hours before the window) and is shown on the order and in your confirmation e-mail.',
                        'Cancelling releases the stock for other customers straight away and returns any coupon you used. After the cut-off the farmer has picked and packed for you, so the order is locked — if something unexpected happens, message the farmer as early as you can.',
                    ]],
                    ['Check before you pay', [
                        'Because you pay at pickup, you see and handle everything before any money changes hands. If an item is missing, damaged, under weight or not what was listed, tell the farmer at the stall. You pay only for what you accept; the farmer adjusts the total on the spot.',
                    ]],
                    ['After you’ve left the market', [
                        'Found a problem once you got home — spoiled inside, wrong variety, short weight? Write to the farmer through your order page or to us within 24 hours of pickup, with your order code (for example GG-7K2M9Q) and a photo. Farmers on GleanGrid commit to a fair outcome, normally one of:',
                        ['list', [
                            'a replacement at your next pickup;',
                            'money back in person at your next visit, or by bank transfer / mobile wallet if you won’t return soon;',
                            'a coupon for the value of the affected items, if you prefer.',
                        ]],
                        'Because produce is perishable, items that were stored incorrectly after pickup, or claims made after 24 hours, are at the farmer’s discretion.',
                    ]],
                    ['When a farmer cancels or declines', [
                        'If a farmer declines or cannot fulfil your order, you owe nothing, any coupon is returned, and you are notified by e-mail and in the app immediately. Favourite the product and turn on its restock alert to hear when it is back.',
                    ]],
                    ['Non-returnable items', [
                        'For food-safety reasons, dairy, eggs, meat, cooked or baked goods and cut produce cannot be handed back once they have left the stall. Quality problems with them are still covered by the 24-hour claim above.',
                    ]],
                    ['Disputes', [
                        "If you can’t reach agreement with a farmer, contact us at {$c['email']}. We look at the order history and messages from both sides and aim to respond within two working days. Stalls with repeated unresolved complaints are reviewed and may be suspended. This policy does not limit your statutory rights under the Sindh Consumer Protection Act, 2014.",
                    ]],
                ],
            ],

            'pickup' => [
                'title' => 'Pickup & Delivery Policy',
                'intro' => 'GleanGrid is pickup-only by design. It keeps produce fresh, keeps prices fair for farmers, and gets you to the market where the good stuff is. Here is exactly how collection works.',
                'sections' => [
                    ['How pickup works', [
                        ['list', [
                            'Choose a pickup window at checkout. Each farmer offers windows on the days their markets trade (for example Sunday 9:00–11:00 at Latifabad Organic Bazaar).',
                            'The farmer accepts the order — you get an e-mail and an in-app notification.',
                            'The evening before market day you get a reminder with the time, the place and your pickup pass.',
                            'On market day the farmer packs it and marks it Ready — you are notified again.',
                            'At the stall, show your pickup pass — the QR code on your order page — or read out your order code (for example GG-7K2M9Q). The farmer scans it, hands over your order, you check it, and you pay them directly.',
                            'The farmer marks the order Completed, and you can then leave a review.',
                        ]],
                    ]],
                    ['Order statuses', [
                        ['list', [
                            'Placed — reserved; waiting for the farmer.',
                            'Accepted — confirmed; the farmer will bring it.',
                            'Ready — packed and waiting at the stall.',
                            'Completed — collected and paid.',
                            'Declined or Cancelled — nothing is owed; stock and coupons are released.',
                        ]],
                    ]],
                    ['Cut-off times', [
                        'Each farmer sets how many hours before a window they stop taking changes (1 to 168 hours). Windows closer than the cut-off do not appear at checkout, and existing orders lock when it passes. The exact cut-off is printed on every order.',
                    ]],
                    ['Windows and capacity', [
                        'Each pickup window accepts a limited number of orders so nobody queues for long. Capacity is checked atomically when you confirm, so a full window can never be overbooked — it simply disappears from checkout.',
                    ]],
                    ['Finding the stall', [
                        'Every order page shows the market, the stall, a map and walking or driving directions from your location. Market opening days and hours are listed on each market’s page.',
                    ]],
                    ['Running late or missed your window?', [
                        'Call, WhatsApp or e-mail the farmer from your order page as soon as you can. Many will hold an order until the market closes. Perishables cannot be kept for the next market day, so once the window has passed the farmer may mark the order as not collected and put the produce back on sale. Repeated no-shows pause pre-ordering on the account.',
                    ]],
                    ['Collecting for someone else', [
                        'Send a family member or friend with the order code. Linked Family accounts can see household orders on their own phones. The farmer may ask for the name on the order.',
                    ]],
                    ['Delivery', [
                        'We don’t offer delivery or courier services, and farmers are not asked to deliver. This keeps prices low and produce fresh. If that changes we will announce it here first.',
                    ]],
                    ['Payment at pickup', [
                        'Pay the farmer the total shown on your order (after any coupon) in cash or by any method they accept — many take bank transfer, JazzCash or Easypaisa. GleanGrid never asks for card details and never collects money on a farmer’s behalf.',
                    ]],
                    ['Weather and market closures', [
                        'If a market closes unexpectedly (weather, public holiday, civic order), affected orders are declined or moved with your agreement and you are notified. A site-wide announcement is shown on the home page when a closure affects many stalls.',
                    ]],
                ],
            ],
        };
    }

    public static function faq(): array
    {
        $c = config('gleangrid.contact');

        return [
            'Getting started' => [
                ['What is GleanGrid?', 'A pre-order platform for Hyderabad’s farmers markets. You browse what local growers will bring this week, reserve it online, and collect it at their stall during a pickup window — paying the farmer in person.'],
                ['Which markets are on GleanGrid?', 'Seven weekly markets across Hyderabad: Qasimabad, Latifabad, Hirabad, Saddar, Paretabad, Auto Bhan and Tando Jam. The Markets page lists each one with its days, hours and map.'],
                ['Do I need an account to browse?', 'No. Anyone can browse markets, farmers and produce and fill a basket. You need a verified account to place a pre-order, save favourites or leave reviews.'],
                ['Is GleanGrid free?', 'Yes, for customers and farmers alike. There are no fees, subscriptions or commissions.'],
            ],
            'Ordering' => [
                ['Do I pay online?', 'No. GleanGrid only reserves your produce. You pay the farmer at the stall when you collect, after checking your order.'],
                ['Can I order from several farmers at once?', 'Yes. Your basket can hold items from many stalls. At checkout each farmer becomes a separate pre-order with its own pickup window.'],
                ['How do I change or cancel an order?', 'Open it under My orders and choose Modify or Cancel. Both work until the farmer’s cut-off time, shown on the order. Cancelling releases the stock and returns any coupon.'],
                ['What is a cut-off time?', 'The moment a farmer stops accepting changes so they can pick and pack. Each farmer sets their own (1 to 168 hours before the window); it is printed on every order.'],
                ['What does “sold out” mean on a product?', 'The farmer’s stock for this week is fully reserved. Tap the heart to save it and turn on the restock alert — we’ll tell you when it’s back.'],
                ['How do coupons work?', 'Enter a code at checkout. It is checked against the stall, dates and usage limit, and the discount is shown before you confirm. If the order is later cancelled or declined, the coupon use is given back.'],
                ['Can I reorder a previous basket?', 'Yes — open a past order and choose Reorder. Items still in stock go straight back into your basket.'],
                ['Can my family share one basket?', 'Yes — use Family sharing to link accounts. Linked members can see household orders and collect them.'],
            ],
            'Pickup & payment' => [
                ['Where do I collect my order?', 'At the farmer’s stall in the market you chose at checkout. The order page has the stall, a map and directions from your location.'],
                ['What do I show at the stall?', 'Your pickup pass — the QR code on your order page — or the order code (for example GG-7K2M9Q). The evening before, you also get a reminder with both.'],
                ['What happens if I miss my pickup?', 'Once the window has passed the farmer can mark the order as not collected and the produce goes back on sale. Repeated missed pickups (by default 3 in 60 days) pause pre-ordering until our team reviews the account.'],
                ['How do I pay?', 'In cash or by any method the farmer accepts, such as bank transfer, JazzCash or Easypaisa. GleanGrid never asks for card details.'],
                ['What if I’m late?', 'Message the farmer from your order. Most will hold your order until the market closes; perishables can’t be kept for the next market day.'],
                ['Is there delivery?', 'Not at the moment — GleanGrid is pickup-only so produce stays fresh and farmers get a fair price. You can send someone else with your order code.'],
            ],
            'Returns & refunds' => [
                ['What if something is wrong with my order?', 'Tell the farmer at the stall — you only pay for what you accept. If you notice a problem at home, report it within 24 hours with your order code and a photo.'],
                ['How are refunds paid?', 'As there is no online payment, refunds are a replacement at your next pickup, cash back in person, a bank or mobile-wallet transfer, or a coupon — whichever you and the farmer agree.'],
                ['What if the farmer cancels?', 'You owe nothing, any coupon is returned and you are notified immediately.'],
            ],
            'Farmers' => [
                ['How do I start selling?', 'Register as a farmer with your stall details. Our team reviews new stalls, usually within a day. Once approved you can list products, set pickup windows and receive orders.'],
                ['Does GleanGrid take a commission?', 'No. Customers pay you directly and in full at your stall.'],
                ['How do pickup windows and capacity work?', 'Add a window for each market day with start and end times and a maximum number of orders. Full windows vanish from checkout automatically, and you set one cut-off for all of them.'],
                ['What is the weekly stock template?', 'Set a usual weekly quantity for each product, then reset your whole stall to it in one click at the start of each week.'],
                ['Can I pause a product?', 'Yes — mark it sold out or temporarily unavailable any time. Customers who favourited it are alerted when you bring it back.'],
                ['Can I create my own coupons?', 'Yes. Approved farmers can create percentage or fixed-amount codes for their stall with dates, a minimum basket and a usage limit.'],
                ['How do I reply to reviews?', 'Open Reviews in your dashboard and write a public reply under any review.'],
            ],
            'Account & security' => [
                ['Why do I need to verify my e-mail?', 'Order updates and pickup codes are sent by e-mail, so we confirm the address with a six-digit code before you can place orders or list products.'],
                ['I got a “new sign-in” e-mail. What should I do?', 'If it was you, nothing. If not, change your password — that also signs out every other device — and contact us.'],
                ['How is my password stored?', 'With Argon2id, a slow, memory-hard hashing algorithm. We can’t see or recover it; we can only help you reset it.'],
                ['Why do I sometimes see an “I’m not a robot” box?', 'Sign-up, contact and password forms use Google reCAPTCHA to keep bots out. On sign-in it only appears if the invisible check is unsure.'],
                ['How do I delete my account or get a copy of my data?', 'Open Profile → Your data. “Download my data” gives you a JSON file of everything we hold; “Delete my account” removes it immediately (open pre-orders are cancelled and past orders are anonymised).'],
                ['Which languages are supported?', 'English, Urdu, Arabic, Hindi, Russian, Chinese, Spanish and French. Switch any time from the globe icon; Urdu and Arabic switch the layout to right-to-left.'],
            ],
            'Help' => [
                ['How do I contact you?', "E-mail {$c['email']} or call {$c['phone']}. You can also use the contact form — we reply within one working day."],
                ['Can Basket Buddy help me?', 'Yes. Tap Basket Buddy at the bottom of any page to find produce, check what’s open today, or get pickup and order answers instantly.'],
                ['I found a security problem. Where do I report it?', "Please e-mail {$c['email']} with the details rather than posting publicly. Our SECURITY.md on GitHub explains the process."],
            ],
        ];
    }
}
