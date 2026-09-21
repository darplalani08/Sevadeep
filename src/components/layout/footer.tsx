import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { FacebookIcon, InstagramIcon, LinkedInIcon, XIcon } from "@/components/common/social-icons";
import { contact, footerLinks, siteConfig, socialLinks } from "@content/site";

const socialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Facebook: FacebookIcon,
  LinkedIn: LinkedInIcon,
  Instagram: InstagramIcon,
  "X (Twitter)": XIcon,
};

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Image src={siteConfig.logo} alt={`${siteConfig.name} logo`} width={40} height={40} className="size-10" />
              <span className="font-heading text-xl font-bold">
                <span className="text-primary">Seva</span>
                <span className="text-accent-600 dark:text-accent-400">Deep</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Let&apos;s Make A Difference — {siteConfig.description}
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{contact.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-primary" />
                <a href={contact.phoneHref} className="hover:text-foreground">
                  {contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-primary" />
                <a href={`mailto:${contact.email}`} className="hover:text-foreground">
                  {contact.email}
                </a>
              </li>
            </ul>
            <div className="mt-5 flex items-center gap-2">
              {socialLinks.map((social) => {
                const Icon = socialIcons[social.name] ?? FacebookIcon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={social.name}
                    className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Icon className="size-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <FooterColumn title="Get In Touch" links={footerLinks.company} />
          <FooterColumn title="Give & Get Help" links={footerLinks.get} />
          <FooterColumn title="Account" links={footerLinks.account} />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} {siteConfig.name}. A Relfor Foundation initiative.</p>
          <p>Built with care in Pune, India.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: readonly { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
