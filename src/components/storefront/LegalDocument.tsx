import type { Locale } from "@/lib/i18n";

type LegalKind = "terms" | "privacy" | "cookies" | "delivery";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

type LegalContent = {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
  note: string;
};

const legalContent: Record<Locale, Record<LegalKind, LegalContent>> = {
  fr: {
    terms: {
      eyebrow: "Cadre contractuel",
      title: "Conditions générales d'utilisation et de vente",
      updated: "Dernière mise à jour : 24 août 2026",
      intro:
        "Les présentes conditions encadrent l'accès, la navigation, la création de compte, l'achat de produits alimentaires, l'utilisation du configurateur de recettes et les services associés proposés par Je mange Africain. Toute utilisation de la plateforme vaut acceptation pleine et entière de ces conditions, sous réserve des dispositions impératives du droit applicable.",
      sections: [
        {
          title: "1. Rôle de Je mange Africain",
          paragraphs: [
            "Je mange Africain exploite une épicerie africaine digitale. La plateforme n'est pas une marketplace ouverte : les produits proposés sont sélectionnés, présentés, commercialisés ou organisés sous le contrôle de Je mange Africain.",
            "Je mange Africain se réserve le droit de modifier l'offre, les zones desservies, les prix, les frais, les fonctionnalités, les recettes, les conditions promotionnelles et les modalités de livraison afin de préserver la qualité, la sécurité, la conformité ou l'équilibre économique du service.",
          ],
        },
        {
          title: "2. Comptes, accès et sécurité",
          paragraphs: [
            "L'utilisateur doit fournir des informations exactes, actuelles et vérifiables. Il demeure responsable de l'utilisation de son compte, de ses identifiants, de ses coordonnées de livraison et des commandes passées depuis son espace.",
            "Je mange Africain peut refuser, suspendre, restreindre ou clôturer un compte en cas de fraude suspectée, impayé, abus de promotions, informations incohérentes, atteinte à la sécurité, comportement déloyal ou tentative de contournement de la plateforme.",
          ],
        },
        {
          title: "3. Produits, recettes et disponibilité",
          paragraphs: [
            "Les visuels, descriptions, conseils de préparation, informations nutritionnelles, pays d'origine et suggestions de recettes sont fournis avec soin mais peuvent varier selon les lots, fournisseurs, saisons et contraintes logistiques.",
            "Le configurateur de recettes est un outil d'aide au panier. Il ne remplace ni l'appréciation personnelle de l'utilisateur, ni un avis médical, nutritionnel ou allergologique. L'utilisateur doit vérifier les allergènes, restrictions alimentaires et quantités avant validation.",
            "Les produits sont proposés dans la limite des stocks disponibles. Je mange Africain peut annuler, fractionner, substituer ou reporter tout ou partie d'une commande lorsque le stock, la chaîne du froid, la conformité ou la livraison l'exige.",
          ],
        },
        {
          title: "4. Prix, paiement et validation de commande",
          paragraphs: [
            "Les prix sont indiqués en euros toutes taxes comprises, hors frais de livraison ou services optionnels. Je mange Africain peut corriger une erreur manifeste de prix, de stock, de description ou de calcul avant l'expédition.",
            "La commande n'est définitivement acceptée qu'après validation du paiement, contrôle antifraude et confirmation opérationnelle. Je mange Africain conserve la propriété des produits jusqu'au paiement complet.",
            "Les codes promotionnels, avoirs, cartes cadeaux et avantages fidélité sont personnels, non monétisables et soumis aux conditions affichées. Je mange Africain peut les retirer en cas d'erreur, d'abus ou de suspicion de fraude.",
          ],
        },
        {
          title: "5. Livraison, chaîne du froid et réception",
          paragraphs: [
            "Les délais annoncés sont indicatifs sauf engagement exprès. Les commandes peuvent être divisées en colis ambiant, réfrigéré ou surgelé afin de respecter la chaîne logistique et les classes thermiques.",
            "Le client doit fournir une adresse complète, être disponible au créneau prévu et vérifier le colis à réception. Tout retard, refus, absence, information erronée ou impossibilité de remise imputable au client peut entraîner des frais supplémentaires ou une perte du droit à indemnisation.",
            "Les réserves liées à un colis manquant, abîmé, décongelé ou non conforme doivent être signalées rapidement avec justificatifs. À défaut, Je mange Africain pourra refuser la prise en charge lorsque l'analyse du dossier ne permet pas d'établir sa responsabilité.",
          ],
        },
        {
          title: "6. Rétractation, retours et remboursements",
          paragraphs: [
            "Conformément au droit applicable, le droit de rétractation ne s'applique pas notamment aux biens susceptibles de se détériorer ou de se périmer rapidement, ni aux produits descellés ne pouvant être renvoyés pour des raisons d'hygiène ou de protection de la santé.",
            "Les retours acceptés doivent suivre la procédure indiquée par Je mange Africain. Sauf obligation légale contraire, les remboursements, avoirs ou remplacements sont accordés après analyse du dossier, des preuves fournies, de l'état du produit et des données logistiques disponibles.",
          ],
        },
        {
          title: "7. Contenus, avis et propriété intellectuelle",
          paragraphs: [
            "Les marques, logos, textes, recettes, interfaces, bases de données, photographies, illustrations et éléments logiciels appartiennent à Je mange Africain ou à ses ayants droit. Toute extraction, reproduction ou réutilisation non autorisée est interdite.",
            "En publiant un avis, une photo, un message ou tout autre contenu, l'utilisateur accorde à Je mange Africain une licence non exclusive pour l'héberger, le modérer, l'afficher, l'adapter techniquement, le traduire et l'utiliser pour l'exploitation, l'amélioration et la promotion raisonnable du service.",
          ],
        },
        {
          title: "8. Responsabilité et preuve",
          paragraphs: [
            "Je mange Africain est soumis à une obligation de moyens pour l'accès à la plateforme, la préparation, l'information et la livraison, sauf disposition impérative contraire. La plateforme peut connaître des interruptions, maintenances, erreurs de tiers, indisponibilités de paiement ou contraintes logistiques.",
            "Dans la mesure permise par la loi, Je mange Africain ne répond pas des pertes indirectes, pertes d'opportunité, pertes de données imputables à l'utilisateur, erreurs d'adresse, usages non conformes, allergies non déclarées ou mauvaise conservation après livraison.",
            "Les journaux techniques, validations de paiement, preuves de préparation, statuts transporteur, échanges d'assistance et traces de connexion pourront être utilisés comme éléments de preuve pour sécuriser la plateforme et défendre les droits de Je mange Africain.",
          ],
        },
        {
          title: "9. Modification et droit applicable",
          paragraphs: [
            "Je mange Africain peut mettre à jour ces conditions pour tenir compte de l'évolution du service, du droit, des fournisseurs, des moyens de paiement ou des contraintes opérationnelles. La version publiée sur la plateforme prévaut.",
            "Tout différend doit d'abord faire l'objet d'une tentative de résolution amiable auprès du service client. Les règles de compétence et de droit applicable seront déterminées par les mentions légales et les dispositions impératives applicables au consommateur.",
          ],
        },
      ],
      note:
        "Ce modèle doit être complété avec les informations légales exactes de la société exploitante avant mise en production commerciale.",
    },
    privacy: {
      eyebrow: "Données personnelles",
      title: "Politique de confidentialité",
      updated: "Dernière mise à jour : 24 août 2026",
      intro:
        "Cette politique explique comment Je mange Africain collecte, utilise, conserve et protège les données personnelles nécessaires à l'exploitation de son épicerie digitale, de son compte client, de son panier, de son configurateur de recettes, de ses paiements, de sa livraison et de son service client.",
      sections: [
        {
          title: "1. Responsable du traitement",
          paragraphs: [
            "Le responsable du traitement est l'entité exploitant Je mange Africain, telle qu'identifiée dans les mentions légales de la plateforme. Pour toute demande liée aux données personnelles, l'utilisateur peut contacter : dpo@jemangeafricain.fr.",
            "Lorsque certains services sont fournis par des partenaires techniques, de paiement, de livraison ou d'assistance, ceux-ci agissent selon leur rôle propre ou comme sous-traitants conformément au droit applicable.",
          ],
        },
        {
          title: "2. Données collectées",
          paragraphs: [
            "Je mange Africain peut traiter les données d'identification, coordonnées, adresses, préférences de langue, historique d'achat, panier, recettes sauvegardées, moyens de paiement tokenisés, réclamations, échanges avec le support, données de livraison, avis, données techniques, cookies, journaux de sécurité et informations nécessaires à la prévention de la fraude.",
            "Les données bancaires complètes ne sont pas stockées par Je mange Africain lorsqu'elles sont traitées par un prestataire de paiement sécurisé.",
          ],
        },
        {
          title: "3. Finalités et bases légales",
          paragraphs: [
            "Les données sont utilisées pour créer et gérer le compte, traiter les commandes, calculer les paniers, organiser la livraison, gérer les paiements, fournir le support, traiter les réclamations, envoyer les communications nécessaires, prévenir la fraude, sécuriser la plateforme et respecter les obligations légales.",
            "Selon les cas, les traitements reposent sur l'exécution du contrat, le respect d'obligations légales, l'intérêt légitime de Je mange Africain, le consentement de l'utilisateur ou la nécessité de défendre les droits de la société.",
          ],
        },
        {
          title: "4. Destinataires",
          paragraphs: [
            "Les données peuvent être accessibles aux équipes habilitées de Je mange Africain, aux hébergeurs, prestataires de paiement, transporteurs, outils de support, conseils, autorités compétentes et prestataires strictement nécessaires au fonctionnement du service.",
            "Je mange Africain ne vend pas les données personnelles. Les partages répondent à une nécessité opérationnelle, contractuelle, légale, sécuritaire ou probatoire.",
          ],
        },
        {
          title: "5. Conservation",
          paragraphs: [
            "Les données sont conservées pendant la durée nécessaire aux finalités poursuivies, puis archivées lorsque cela est requis pour la comptabilité, la preuve, la sécurité, la prévention de la fraude, le traitement des litiges ou la défense des droits de Je mange Africain.",
            "Les données de prospection sont conservées jusqu'au retrait du consentement ou à l'expiration des durées applicables. Les journaux techniques peuvent être conservés pour sécuriser la plateforme et établir la preuve des opérations.",
          ],
        },
        {
          title: "6. Droits des utilisateurs",
          paragraphs: [
            "Selon le droit applicable, l'utilisateur peut demander l'accès, la rectification, l'effacement, la limitation, l'opposition ou la portabilité de ses données, ainsi que le retrait de son consentement lorsqu'un traitement repose sur celui-ci.",
            "Je mange Africain peut demander une vérification d'identité et refuser ou différer une demande lorsque la conservation est nécessaire au contrat, à une obligation légale, à la sécurité, à la preuve, à la prévention de la fraude ou à la défense de ses droits.",
          ],
        },
        {
          title: "7. Sécurité et transferts",
          paragraphs: [
            "Je mange Africain met en oeuvre des mesures raisonnables de sécurité, de limitation des accès, de journalisation et de cloisonnement des rôles. L'utilisateur doit aussi protéger son compte et utiliser des informations exactes.",
            "Certains prestataires peuvent être situés hors de l'Union européenne. Lorsque le droit l'exige, Je mange Africain s'appuie sur des garanties appropriées ou des mécanismes reconnus pour encadrer ces transferts.",
          ],
        },
        {
          title: "8. Cookies et mesures d'audience",
          paragraphs: [
            "La plateforme utilise des cookies ou traceurs nécessaires au panier, à la langue, à la session, à la sécurité et au fonctionnement demandé par l'utilisateur. Ces traceurs peuvent être exemptés de consentement lorsqu'ils sont strictement nécessaires.",
            "Les traceurs de mesure d'audience, de personnalisation ou de marketing sont utilisés selon les choix de consentement disponibles sur la plateforme lorsqu'un consentement est requis.",
          ],
        },
      ],
      note:
        "Cette politique doit être adaptée avec les coordonnées exactes de la société, les prestataires réellement utilisés et les durées de conservation validées.",
    },
    cookies: {
      eyebrow: "Préférences",
      title: "Politique de cookies",
      updated: "Dernière mise à jour : 24 août 2026",
      intro:
        "Je mange Africain utilise des cookies et traceurs pour faire fonctionner le panier, la langue, la session, la sécurité, la mesure d'audience et certaines préférences.",
      sections: [
        {
          title: "Traceurs nécessaires",
          paragraphs: [
            "Les traceurs strictement nécessaires au service demandé, comme le panier, l'authentification, la langue, la sécurité ou la prévention de fraude, peuvent être déposés sans consentement préalable lorsque la loi le permet.",
          ],
        },
        {
          title: "Traceurs soumis au consentement",
          paragraphs: [
            "Les traceurs de mesure d'audience avancée, de personnalisation, de publicité ou de réseaux sociaux ne sont utilisés qu'en fonction des choix exprimés par l'utilisateur lorsque le consentement est requis.",
            "L'utilisateur peut modifier ses préférences à tout moment depuis le bandeau ou le centre de préférences disponible sur la plateforme.",
          ],
        },
      ],
      note: "La liste exacte des traceurs doit être complétée avant l'activation d'outils tiers.",
    },
    delivery: {
      eyebrow: "Logistique",
      title: "Livraison, retours et remboursements",
      updated: "Dernière mise à jour : 24 août 2026",
      intro:
        "Je mange Africain organise les livraisons selon le pays, le code postal, le poids, le volume, les classes thermiques et les disponibilités transporteurs.",
      sections: [
        {
          title: "Livraison",
          paragraphs: [
            "Les commandes peuvent être expédiées en plusieurs colis pour respecter les classes ambiant, réfrigéré et surgelé. Les délais sont indicatifs sauf engagement exprès.",
            "Le client doit vérifier ses coordonnées, être disponible au créneau convenu et signaler immédiatement toute anomalie avec photos et justificatifs.",
          ],
        },
        {
          title: "Réclamations",
          paragraphs: [
            "Toute réclamation liée à un colis manquant, abîmé, décongelé ou non conforme doit être transmise rapidement via le service client. Je mange Africain analyse les preuves, les statuts transporteur et les données de préparation avant toute décision.",
            "Lorsque la responsabilité de Je mange Africain est établie, une solution peut prendre la forme d'un remplacement, d'un avoir ou d'un remboursement selon le produit et la situation.",
          ],
        },
      ],
      note: "Les conditions transporteur applicables peuvent compléter ces règles.",
    },
  },
  en: {
    terms: {
      eyebrow: "Contractual framework",
      title: "Terms of use and sale",
      updated: "Last updated: August 24, 2026",
      intro:
        "These terms govern access to Je mange Africain, account creation, food product purchases, recipe configuration and related services. Using the platform means accepting these terms, subject to mandatory applicable law.",
      sections: [
        {
          title: "1. Je mange Africain's role",
          paragraphs: [
            "Je mange Africain operates a digital African grocery. It is not an open marketplace: products are selected, presented, sold or organized under Je mange Africain's control.",
            "Je mange Africain may change the offer, covered areas, prices, fees, features, recipes, promotions and delivery methods to preserve quality, security, compliance or business balance.",
          ],
        },
        {
          title: "2. Accounts and security",
          paragraphs: [
            "Users must provide accurate, current and verifiable information and remain responsible for their account, credentials, delivery details and orders.",
            "Je mange Africain may refuse, suspend, restrict or close an account in case of suspected fraud, unpaid amounts, promotion abuse, inconsistent information, security risk, unfair conduct or attempted platform circumvention.",
          ],
        },
        {
          title: "3. Products, recipes and availability",
          paragraphs: [
            "Pictures, descriptions, preparation advice, nutrition information, origin and recipe suggestions may vary by batch, supplier, season and logistics constraints.",
            "The recipe configurator helps build a basket. It does not replace personal judgment or medical, nutritional or allergy advice. Users must check allergens, restrictions and quantities before ordering.",
            "Products are sold subject to availability. Je mange Africain may cancel, split, substitute or postpone an order where stock, cold chain, compliance or delivery requires it.",
          ],
        },
        {
          title: "4. Prices, payment and order acceptance",
          paragraphs: [
            "Prices are shown in euros including taxes, excluding delivery or optional services. Je mange Africain may correct obvious price, stock, description or calculation errors before shipment.",
            "An order is finally accepted only after payment validation, fraud checks and operational confirmation. Je mange Africain retains ownership until full payment.",
            "Promo codes, credits, gift cards and loyalty benefits are personal, not cashable and subject to displayed terms. They may be withdrawn in case of error, abuse or suspected fraud.",
          ],
        },
        {
          title: "5. Delivery and receipt",
          paragraphs: [
            "Delivery estimates are indicative unless expressly guaranteed. Orders may be split into ambient, chilled or frozen parcels to respect thermal classes.",
            "The customer must provide a complete address, be available for delivery and check the parcel upon receipt. Customer-caused delay, refusal, absence, incorrect information or failed delivery may lead to additional fees or loss of compensation rights.",
          ],
        },
        {
          title: "6. Withdrawal, returns and refunds",
          paragraphs: [
            "Under applicable law, withdrawal rights do not apply in particular to goods liable to deteriorate or expire rapidly, or to unsealed goods that cannot be returned for hygiene or health protection reasons.",
            "Accepted returns must follow Je mange Africain's procedure. Unless mandatory law provides otherwise, refunds, credits or replacements are granted after review of the case, evidence, product condition and available logistics data.",
          ],
        },
        {
          title: "7. Content and intellectual property",
          paragraphs: [
            "Brands, logos, texts, recipes, interfaces, databases, photos, illustrations and software elements belong to Je mange Africain or its right holders. Unauthorized extraction, copying or reuse is prohibited.",
            "By posting a review, photo, message or content, the user grants Je mange Africain a non-exclusive license to host, moderate, display, technically adapt, translate and use it for operating, improving and reasonably promoting the service.",
          ],
        },
        {
          title: "8. Liability and evidence",
          paragraphs: [
            "Je mange Africain uses reasonable efforts for platform access, preparation, information and delivery unless mandatory law provides otherwise. Interruptions, maintenance, third-party errors, payment downtime and logistics constraints may occur.",
            "To the extent permitted by law, Je mange Africain is not liable for indirect losses, opportunity loss, user-caused data loss, address errors, misuse, undeclared allergies or poor conservation after delivery.",
            "Technical logs, payment confirmations, preparation proofs, carrier statuses, support exchanges and connection records may be used as evidence to secure the platform and defend Je mange Africain's rights.",
          ],
        },
      ],
      note: "This template must be completed with the exact legal information of the operating company before commercial production launch.",
    },
    privacy: {
      eyebrow: "Personal data",
      title: "Privacy policy",
      updated: "Last updated: August 24, 2026",
      intro:
        "This policy explains how Je mange Africain collects, uses, stores and protects personal data required to operate its digital grocery, customer account, basket, recipe configurator, payments, delivery and support.",
      sections: [
        {
          title: "1. Controller",
          paragraphs: [
            "The controller is the entity operating Je mange Africain, as identified in the platform's legal notices. Data requests may be sent to dpo@jemangeafricain.fr.",
            "Technical, payment, delivery or support partners act according to their own role or as processors under applicable law.",
          ],
        },
        {
          title: "2. Data collected",
          paragraphs: [
            "Je mange Africain may process identity data, contact details, addresses, language preferences, purchase history, basket, saved recipes, tokenized payment data, claims, support exchanges, delivery data, reviews, technical data, cookies, security logs and fraud prevention data.",
            "Full banking data is not stored by Je mange Africain when processed by a secure payment provider.",
          ],
        },
        {
          title: "3. Purposes and legal bases",
          paragraphs: [
            "Data is used to manage accounts, process orders, calculate baskets, organize delivery, manage payments, provide support, handle claims, send necessary communications, prevent fraud, secure the platform and comply with legal obligations.",
            "Processing may rely on contract performance, legal obligations, Je mange Africain's legitimate interest, user consent or the need to defend company rights.",
          ],
        },
        {
          title: "4. Recipients and retention",
          paragraphs: [
            "Data may be available to authorized Je mange Africain teams, hosting providers, payment providers, carriers, support tools, advisers, competent authorities and providers strictly necessary to the service.",
            "Je mange Africain does not sell personal data. Data is retained for the time needed for each purpose and then archived where required for accounting, evidence, security, fraud prevention, disputes or rights defense.",
          ],
        },
        {
          title: "5. User rights",
          paragraphs: [
            "Depending on applicable law, users may request access, rectification, erasure, restriction, objection, portability and withdrawal of consent where processing is consent-based.",
            "Je mange Africain may request identity verification and refuse or defer a request where retention is necessary for the contract, legal obligations, security, evidence, fraud prevention or defense of rights.",
          ],
        },
        {
          title: "6. Security, transfers and cookies",
          paragraphs: [
            "Je mange Africain implements reasonable security, access limitation, logging and role separation measures. Users must also protect their account and provide accurate information.",
            "Some providers may be located outside the European Union. Where required, Je mange Africain relies on appropriate safeguards or recognized transfer mechanisms.",
            "Necessary cookies support basket, language, session, security and requested features. Audience, personalization or marketing trackers follow the user's consent choices where required.",
          ],
        },
      ],
      note: "This policy must be adapted with the exact company details, actual providers and validated retention periods.",
    },
    cookies: {
      eyebrow: "Preferences",
      title: "Cookie policy",
      updated: "Last updated: August 24, 2026",
      intro: "Je mange Africain uses cookies and trackers for basket, language, session, security, analytics and preferences.",
      sections: [
        {
          title: "Necessary trackers",
          paragraphs: ["Trackers strictly necessary for requested services, such as basket, authentication, language, security or fraud prevention, may be used without prior consent where permitted by law."],
        },
        {
          title: "Consent-based trackers",
          paragraphs: ["Advanced analytics, personalization, advertising or social media trackers are used according to the user's choices where consent is required.", "Users may change preferences at any time through the banner or preference center."],
        },
      ],
      note: "The exact tracker list must be completed before third-party tools are activated.",
    },
    delivery: {
      eyebrow: "Logistics",
      title: "Delivery, returns and refunds",
      updated: "Last updated: August 24, 2026",
      intro: "Je mange Africain organizes deliveries according to country, postal code, weight, volume, thermal classes and carrier availability.",
      sections: [
        {
          title: "Delivery",
          paragraphs: ["Orders may ship in multiple parcels to respect ambient, chilled and frozen classes. Delivery times are estimates unless expressly guaranteed.", "The customer must check delivery details, be available during the slot and immediately report any issue with photos and evidence."],
        },
        {
          title: "Claims",
          paragraphs: ["Claims for missing, damaged, thawed or non-conforming parcels must be sent promptly through support. Je mange Africain reviews evidence, carrier statuses and preparation data before any decision.", "Where Je mange Africain's responsibility is established, the solution may be replacement, credit or refund depending on the product and situation."],
        },
      ],
      note: "Applicable carrier terms may supplement these rules.",
    },
  },
};

export function LegalDocument({ kind, locale }: { kind: LegalKind; locale: Locale }) {
  const doc = legalContent[locale][kind];

  return (
    <article className="space-y-6 text-sm leading-relaxed text-charcoal">
      <header className="space-y-2 border-b border-charcoal/10 pb-6">
        <p className="jma-eyebrow">{doc.eyebrow}</p>
        <h1 className="font-display text-3xl font-semibold leading-tight text-charcoal md:text-4xl">{doc.title}</h1>
        <p className="text-xs text-muted-foreground">{doc.updated}</p>
        <p className="pt-2 text-[15px] leading-relaxed text-charcoal">{doc.intro}</p>
      </header>
      <div className="space-y-5">
        {doc.sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-charcoal">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="rounded-lg border border-gold/30 bg-gold/10 p-3 text-xs font-medium text-charcoal">
        {doc.note}
      </p>
    </article>
  );
}
