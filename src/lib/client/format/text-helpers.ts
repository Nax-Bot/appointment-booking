// Les initiales affichées dans un rond à la place d'une photo : « Test Front » donne « TF »
export function getInitials(firstName: string, lastName: string): string {
    return firstName.charAt(0).toUpperCase() + lastName.charAt(0).toUpperCase();
}