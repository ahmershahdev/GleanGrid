<tr>
<td>
<table class="footer" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td class="content-cell" align="center">
{{ Illuminate\Mail\Markdown::parse($slot) }}
<p class="footer-meta">
GleanGrid · {{ config('gleangrid.contact.address') }}<br>
<a href="mailto:{{ config('gleangrid.contact.email') }}">{{ config('gleangrid.contact.email') }}</a> · {{ config('gleangrid.contact.phone') }}<br>
<a href="{{ route('privacy') }}">Privacy</a> · <a href="{{ route('terms') }}">Terms</a> · <a href="{{ route('faq') }}">Help</a>
</p>
</td>
</tr>
</table>
</td>
</tr>
