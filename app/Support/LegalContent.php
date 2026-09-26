<?php

namespace App\Support;

/**
 * Copy for the FAQ and policy pages. Written for how GleanGrid actually works:
 * pickup only, pay the farmer in person, no card data ever touches us.
 *
 * Sections are [heading, [paragraph|['list', [...items]]]].
 */
class LegalContent
{
    public const UPDATED = '2026-09-27';

    public static function page(string $key): array
    {
        $contact = config('gleangrid.contact');

        return match ($key) {
            'terms' => [
                'title' => 'Terms of Use',
                'intro' => 'These terms are the ground rules for using GleanGrid, the pre-order platform for farmers markets in Hyderabad, Sindh. By creating an account or placing a pre-order you agree to them. We have kept them as short and plain as we can.',
                'sections' => [
                    ['What GleanGrid is — and isn’t', [
                        'GleanGrid is a meeting place. Farmers list what they will bring to market; customers reserve it and collect it in person. The sale itself is between you and the farmer. We do not buy, store, transport or resell produce.',
                        'We do not process payments. Every order is paid for at the stall, directly to the farmer, in the way you both agree.',
                    ]],
                    ['Your account', [
                        ['list', [
                            'Give accurate details — your name, phone number and address help farmers recognise you at pickup.',
                            'Keep your password private. You are responsible for activity on your account until you tell us it has been compromised.',
                            'One person per account. Households can link accounts with Family sharing instead of sharing a password.',
                            'You must be at least 16, or have a parent or guardian’s permission.',
                        ]],
                    ]],
                    ['Pre-orders', [
                        'A pre-order is a reservation, not a purchase. It holds stock for you until the pickup window. You can change or cancel it until the farmer’s cut-off time shown on the order.',
                        'A farmer may decline an order, for example after a poor harvest. You will be told straight away and nothing is owed.',
                        'Please turn up. Repeated no-shows hurt small growers who set produce aside for you, and may lead us to limit your account.',
                    ]],
                    ['Farmers and listings', [
                        'Farmers must describe produce honestly — price, unit, quantity and growing practices. Stalls are approved by our team before they can list, but we do not certify organic status, food safety or licences; that responsibility stays with each farmer.',
                        'We may remove listings or reviews that are misleading, unsafe, abusive or break the law, and suspend accounts that do so repeatedly.',
                    ]],
                    ['Reviews', [
                        'Reviews can only be left after a completed order, so every rating comes from a real pickup. Keep them honest and respectful. Farmers can reply publicly.',
                    ]],
                    ['Fair use', [
                        ['list', [
                            'No scraping, automated ordering, or attempts to get around rate limits and security controls.',
                            'No fake accounts, fake reviews or harassment of farmers, customers or staff.',
                            'No uploading anything you don’t have the rights to.',
                        ]],
                    ]],
                    ['Liability', [
                        'We work hard to keep GleanGrid accurate and available, but market days, weather and harvests are unpredictable. The service is provided “as is”. To the extent the law allows, GleanGrid is not liable for the quality of produce, missed pickups or losses arising from a transaction between a customer and a farmer.',
                    ]],
                    ['Changes and governing law', [
                        'If these terms change in a meaningful way we will post an announcement on the site first. These terms are governed by the laws of Pakistan, and the courts of Hyderabad, Sindh have jurisdiction.',
                        "Questions? Write to {$contact['email']} or call {$contact['phone']}.",
                    ]],
                ],
            ],

            'privacy' => [
                'title' => 'Privacy Policy',
                'intro' => 'We collect as little as we can, use it only to run GleanGrid, and never sell it. This page explains exactly what we hold and why.',
                'sections' => [
                    ['What we collect', [
                        ['list', [
                            'Account details: name, username, e-mail, phone number, address and preferred language.',
                            'For farmers: stall name, contact person, stall location and map pin, and the markets you trade at.',
                            'Order history: what you reserved, from whom, and your pickup windows.',
                            'Reviews, favourites and family links you create.',
                            'Security records: sign-in times, IP address and a coarse device description (for example “Chrome on Android”), used to spot suspicious sign-ins.',
                        ]],
                        'We never collect card or bank details — payment happens in person at the stall.',
                    ]],
                    ['How we use it', [
                        ['list', [
                            'To run your orders: the farmer you order from sees your name, phone number and order so they can prepare it and recognise you.',
                            'To send the e-mails you need: codes, order updates, pickup reminders and security alerts.',
                            'To keep the platform safe: rate limiting, bot protection and fraud prevention.',
                            'To produce anonymous, aggregated market statistics.',
                        ]],
                    ]],
                    ['Who else sees it', [
                        'Only the farmers you order from, and our small team when they need to help you. We use a few service providers to operate the site — e-mail delivery, map tiles from OpenStreetMap and, where enabled, Google reCAPTCHA to tell people from bots. reCAPTCHA is subject to Google’s own privacy policy and terms.',
                    ]],
                    ['Cookies', [
                        'We use only the cookies needed to keep you signed in, protect forms against forgery (CSRF) and remember your language and theme. No advertising or cross-site tracking cookies.',
                    ]],
                    ['How long we keep it', [
                        'Account data stays while your account is open. Order records are kept for two years for farmers’ bookkeeping, then anonymised. Sign-in records are kept for 90 days.',
                    ]],
                    ['Your rights', [
                        'You can view and correct your details on your profile at any time, sign out of other devices, and ask us to export or delete your data. We will reply within 30 days.',
                    ]],
                    ['Security', [
                        'Passwords are stored with Argon2id, a slow, memory-hard hash — nobody at GleanGrid can read them. Traffic is encrypted with HTTPS, forms are protected against forgery, and sign-ins from new devices trigger an e-mail alert.',
                    ]],
                    ['Contact', [
                        "Privacy questions go to {$contact['email']}. GleanGrid is operated from {$contact['address']}.",
                    ]],
                ],
            ],

            'returns' => [
                'title' => 'Returns, Refunds & Cancellations',
                'intro' => 'Fresh food doesn’t travel back to the farm, so our approach is simple: check it at the stall, and speak up right there.',
                'sections' => [
                    ['Cancelling a pre-order', [
                        'You can change or cancel any pre-order for free until the farmer’s cut-off time. The cut-off is shown on every order and is usually 12–24 hours before your pickup window. After the cut-off the farmer has picked and packed for you, so the order is locked.',
                    ]],
                    ['Check before you pay', [
                        'Because you pay at pickup, you see everything before any money changes hands. If an item is missing, damaged or not what was listed, tell the farmer at the stall — you only pay for what you accept.',
                    ]],
                    ['After you’ve left the market', [
                        'Found a problem once you got home? Contact the farmer through your order page, or write to us, within 24 hours with your order code and a photo. Farmers on GleanGrid commit to a fair outcome — usually a replacement at your next pickup or money back in person.',
                    ]],
                    ['When a farmer cancels', [
                        'If a farmer declines or can’t fulfil your order, you owe nothing and are notified immediately. Items you favourited will alert you when they are back in stock.',
                    ]],
                    ['Disputes', [
                        'If you can’t reach agreement with a farmer, our team will step in. Stalls with repeated unresolved complaints are reviewed and may be suspended.',
                    ]],
                ],
            ],

            'pickup' => [
                'title' => 'Pickup & Delivery Policy',
                'intro' => 'GleanGrid is pickup-only by design. It keeps produce fresh, keeps prices fair for farmers, and gets you to the market where the good stuff is.',
                'sections' => [
                    ['How pickup works', [
                        ['list', [
                            'Choose a pickup window at checkout — each farmer offers slots on the days their market trades.',
                            'You’ll get an e-mail and an in-app alert when the farmer accepts, and again when your order is packed and ready.',
                            'At the stall, show your order code (for example GG-7K2M9Q). The farmer hands over your order and you pay them directly.',
                        ]],
                    ]],
                    ['Windows and capacity', [
                        'Each pickup window has a limited number of orders so nobody queues for long. Full windows disappear from checkout automatically.',
                    ]],
                    ['Missed your window?', [
                        'Message the farmer from your order page as soon as you can. Many will hold an order until the market closes, but perishables can’t be kept for the next market day.',
                    ]],
                    ['Delivery', [
                        'We don’t offer delivery or courier services. You’re welcome to send a family member — linked family accounts can see and collect household orders.',
                    ]],
                    ['Payment at pickup', [
                        'Pay the farmer in cash or by any method they accept (many take bank transfer or mobile wallets). GleanGrid never asks for card details.',
                    ]],
                ],
            ],
        };
    }

    /** FAQ grouped by topic: [topic => [[question, answer], …]]. */
    public static function faq(): array
    {
        $contact = config('gleangrid.contact');

        return [
            'Ordering' => [
                ['Do I pay online?', 'No. GleanGrid only reserves your produce. You pay the farmer at the stall when you collect, after checking your order.'],
                ['Can I order from several farmers at once?', 'Yes. Your basket can hold items from many stalls. At checkout each farmer becomes a separate pre-order with its own pickup window.'],
                ['How do I change or cancel an order?', 'Open it under My orders and choose Modify or Cancel. Both work until the farmer’s cut-off time, shown on the order.'],
                ['What does “sold out” mean on a product?', 'The farmer’s stock for this week is fully reserved. Tap the heart to save it and we’ll alert you when it’s back.'],
                ['Can my family share one basket?', 'Yes — use Family sharing to link accounts. Linked members can see household orders and reorder together.'],
            ],
            'Pickup' => [
                ['Where do I collect my order?', 'At the farmer’s stall in the market you chose at checkout. The order page has the stall number, a map and directions from your location.'],
                ['What if I’m late?', 'Message the farmer from your order. Most will hold your order until the market closes.'],
                ['Is there delivery?', 'Not at the moment — GleanGrid is pickup-only so produce stays fresh and farmers get a fair price.'],
            ],
            'Farmers' => [
                ['How do I start selling?', 'Register as a farmer with your stall details. Our team reviews new stalls, usually within a day. Once approved you can list products, set pickup windows and receive orders.'],
                ['Does GleanGrid take a commission?', 'No. Customers pay you directly and in full at your stall.'],
                ['What is the weekly stock template?', 'Set a usual weekly quantity for each product, then reset your whole stall to it in one click at the start of each week.'],
                ['Can I pause a product?', 'Yes — mark it sold out or temporarily unavailable any time. Customers who favourited it are alerted when you bring it back.'],
            ],
            'Account & security' => [
                ['Why do I need to verify my e-mail?', 'Order updates and pickup codes are sent by e-mail, so we confirm the address with a six-digit code before you can place orders or list products.'],
                ['I got a “new sign-in” e-mail. What should I do?', 'If it was you, nothing. If not, change your password — that also signs out every other device — and contact us.'],
                ['How is my password stored?', 'With Argon2id, a slow, memory-hard hashing algorithm. We can’t see or recover it; we can only help you reset it.'],
                ['Which languages are supported?', 'English, Urdu, Arabic, Hindi, Russian, Chinese, Spanish and French. Switch any time from the globe icon.'],
            ],
            'Help' => [
                ['How do I contact you?', "E-mail {$contact['email']} or call {$contact['phone']}. You can also use the contact form — we reply within one working day."],
                ['Can Basket Buddy help me?', 'Yes. Tap Basket Buddy at the bottom of any page to find produce, check what’s open today, or get pickup and order answers instantly.'],
            ],
        ];
    }
}
